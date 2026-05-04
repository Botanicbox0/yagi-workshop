"use client";

// =============================================================================
// Phase 5 Wave C C_3 — Material append modal (in_review status).
//
// Wires the in_review [자료 추가하기] CTA to:
//   1. R2 presigned PUT URL via Wave B getBriefingDocumentPutUrlAction
//   2. Direct PUT upload from the browser
//   3. INSERT into briefing_documents via Wave B addBriefingDocumentAction
//
// kind selector: brief | reference
// source selector: upload | url
//
// Note (FU-Phase5-16): briefing_documents INSERT RLS (Wave A sub_5 F2)
// currently requires parent project status='draft'. An in_review caller
// hits 'forbidden' — the modal surfaces a clear toast pointing at the
// FU. The action wiring + form structure remain shipped per SPEC, so
// when FU-Phase5-16 extends the policy (status IN ('draft','in_review')),
// this modal works end-to-end without UI changes.
// =============================================================================

import { useState, useTransition } from "react";
import { Loader2, FileText, Link as LinkIcon, Upload } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  getBriefingDocumentPutUrlAction,
  addBriefingDocumentAction,
} from "@/app/[locale]/app/projects/new/briefing-step2-actions";
import type { MaterialAppendModalLabels } from "./next-action-cta";

const ACCEPT_MIME =
  "application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,image/jpeg,image/png,image/webp,image/gif";

export function MaterialAppendModal({
  projectId,
  labels,
}: {
  projectId: string;
  labels: MaterialAppendModalLabels;
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"brief" | "reference">("brief");
  const [source, setSource] = useState<"upload" | "url">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [pending, startTransition] = useTransition();

  function reset() {
    setKind("brief");
    setSource("upload");
    setFile(null);
    setUrl("");
  }

  const submitAllowed =
    (source === "upload" && !!file) ||
    (source === "url" && url.trim().length > 0);

  async function handleSubmit() {
    startTransition(async () => {
      try {
        if (source === "upload" && file) {
          const presign = await getBriefingDocumentPutUrlAction({
            projectId,
            kind,
            contentType: file.type,
            sizeBytes: file.size,
          });
          if (!presign.ok) {
            const key =
              presign.error === "forbidden"
                ? "errorRlsPending"
                : "errorUnknown";
            toast.error(labels[key as "errorRlsPending" | "errorUnknown"]);
            return;
          }
          const putRes = await fetch(presign.putUrl, {
            method: "PUT",
            body: file,
            headers: { "Content-Type": file.type },
          });
          if (!putRes.ok) {
            toast.error(labels.errorUnknown);
            return;
          }
          const insert = await addBriefingDocumentAction({
            projectId,
            kind,
            source_type: "upload",
            storage_key: presign.storageKey,
            filename: file.name,
            size_bytes: file.size,
            mime_type: file.type,
          });
          if (!insert.ok) {
            const key =
              insert.error === "forbidden"
                ? "errorRlsPending"
                : "errorUnknown";
            toast.error(labels[key as "errorRlsPending" | "errorUnknown"]);
            return;
          }
        } else if (source === "url" && url.trim()) {
          const insert = await addBriefingDocumentAction({
            projectId,
            kind,
            source_type: "url",
            url: url.trim(),
          });
          if (!insert.ok) {
            const key =
              insert.error === "forbidden"
                ? "errorRlsPending"
                : "errorUnknown";
            toast.error(labels[key as "errorRlsPending" | "errorUnknown"]);
            return;
          }
        }
        toast.success(labels.successToast);
        setOpen(false);
        reset();
      } catch (e) {
        console.error("[MaterialAppendModal] submit threw:", e);
        toast.error(labels.errorUnknown);
      }
    });
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!pending) setOpen(next);
      }}
    >
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-sm rounded-full px-5"
        >
          <Upload className="w-3.5 h-3.5 mr-1.5" />
          {labels.trigger}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{labels.title}</AlertDialogTitle>
          <AlertDialogDescription className="keep-all leading-relaxed">
            {labels.description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-5 py-2">
          {/* kind selector */}
          <div className="flex flex-col gap-2">
            <Label className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground keep-all">
              {labels.kindLabel}
            </Label>
            <div className="flex gap-2">
              {(["brief", "reference"] as const).map((opt) => {
                const selected = kind === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setKind(opt)}
                    aria-pressed={selected}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-medium transition-colors keep-all",
                      selected
                        ? "bg-foreground text-background"
                        : "border border-border/60 hover:border-border",
                    )}
                  >
                    {opt === "brief" ? labels.kindBrief : labels.kindReference}
                  </button>
                );
              })}
            </div>
          </div>

          {/* source selector */}
          <div className="flex flex-col gap-2">
            <Label className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground keep-all">
              {labels.sourceLabel}
            </Label>
            <div className="flex gap-2">
              {(["upload", "url"] as const).map((opt) => {
                const selected = source === opt;
                const Icon = opt === "upload" ? FileText : LinkIcon;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setSource(opt)}
                    aria-pressed={selected}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-medium transition-colors keep-all flex items-center gap-1.5",
                      selected
                        ? "bg-foreground text-background"
                        : "border border-border/60 hover:border-border",
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {opt === "upload" ? labels.sourceUpload : labels.sourceUrl}
                  </button>
                );
              })}
            </div>
          </div>

          {/* file or url input */}
          {source === "upload" ? (
            <div className="flex flex-col gap-2">
              <Label
                htmlFor="material-append-file"
                className="text-xs font-medium text-foreground keep-all"
              >
                {labels.fileLabel}
              </Label>
              <Input
                id="material-append-file"
                type="file"
                accept={ACCEPT_MIME}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="text-sm"
              />
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Label
                htmlFor="material-append-url"
                className="text-xs font-medium text-foreground keep-all"
              >
                {labels.urlLabel}
              </Label>
              <Input
                id="material-append-url"
                type="url"
                placeholder={labels.urlPlaceholder}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="text-sm"
              />
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending} onClick={reset}>
            {labels.cancel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              if (!submitAllowed || pending) return;
              void handleSubmit();
            }}
            disabled={!submitAllowed || pending}
            className="bg-[#71D083] text-black hover:bg-[#71D083]/90 focus-visible:ring-[#71D083]/40"
          >
            {pending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              labels.submit
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
