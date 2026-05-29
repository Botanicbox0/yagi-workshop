"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Download,
  ExternalLink,
  FileVideo,
  ImageIcon,
  LinkIcon,
  Loader2,
  MessageSquare,
  PackagePlus,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createProjectDeliverableVersionAction,
  getDeliverableUploadPutUrlAction,
} from "@/app/[locale]/app/projects/[id]/_actions/project-deliverables";

export type VersionStackDeliverable = {
  id: string;
  version: number;
  status: "submitted" | "changes_requested" | "approved" | string;
  note: string | null;
  feedbackCount: number;
  createdAt: string;
  submittedBy: string | null;
  storageAssets: Array<{
    key: string;
    url: string;
    kind: "image" | "video" | "file";
  }>;
  externalAssets: Array<{
    url: string;
    provider: "youtube" | "vimeo" | "generic";
    title: string | null;
    thumbnailUrl: string | null;
  }>;
};

type Labels = {
  title: string;
  subtitle: string;
  uploadTitle: string;
  uploadFile: string;
  uploadUrl: string;
  uploadUrlPlaceholder: string;
  uploadNote: string;
  uploadNotePlaceholder: string;
  uploadSubmit: string;
  uploadSubmitting: string;
  emptyTitle: string;
  emptySub: string;
  version: string;
  submittedBy: string;
  submittedAt: string;
  versionsCount: string;
  assets: string;
  download: string;
  openExternal: string;
  storedFile: string;
  noNote: string;
  feedback: string;
  feedbackCount: string;
  errors: {
    assetRequired: string;
    invalidUrl: string;
    fileTooLarge: string;
    uploadFailed: string;
    forbidden: string;
    generic: string;
  };
  success: string;
  status: Record<string, string>;
};

const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024;

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return `https://www.youtube.com/embed/${parsed.pathname.slice(1)}`;
    if (host === "youtube.com" || host === "m.youtube.com") {
      const id = parsed.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    return null;
  } catch {
    return null;
  }
}

function getVimeoEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host !== "vimeo.com") return null;
    const id = parsed.pathname.split("/").filter(Boolean)[0];
    return id ? `https://player.vimeo.com/video/${id}` : null;
  } catch {
    return null;
  }
}

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "en" ? "en" : "ko", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function statusClass(status: string) {
  if (status === "approved") {
    return "border-green-500/30 bg-green-500/10 text-green-300";
  }
  if (status === "changes_requested") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  }
  return "border-border bg-surface-card text-muted-foreground";
}

export function VersionStackTab({
  projectId,
  deliverables,
  canUpload,
  locale,
  labels,
}: {
  projectId: string;
  deliverables: VersionStackDeliverable[];
  canUpload: boolean;
  locale: string;
  labels: Labels;
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [externalUrl, setExternalUrl] = useState("");
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  const sortedDeliverables = useMemo(
    () => [...deliverables].sort((a, b) => b.version - a.version),
    [deliverables],
  );

  function resetForm() {
    setFile(null);
    setExternalUrl("");
    setNote("");
  }

  async function submit() {
    const trimmedUrl = externalUrl.trim();
    if (!file && !trimmedUrl) {
      toast.error(labels.errors.assetRequired);
      return;
    }
    if (file && file.size > MAX_FILE_SIZE) {
      toast.error(labels.errors.fileTooLarge);
      return;
    }
    if (trimmedUrl && !isHttpUrl(trimmedUrl)) {
      toast.error(labels.errors.invalidUrl);
      return;
    }

    startTransition(async () => {
      let storagePaths: string[] = [];
      if (file) {
        const presign = await getDeliverableUploadPutUrlAction({
          projectId,
          fileName: file.name,
          contentType: file.type,
        });
        if (!presign.ok) {
          toast.error(
            presign.error === "forbidden"
              ? labels.errors.forbidden
              : labels.errors.uploadFailed,
          );
          return;
        }

        const putRes = await fetch(presign.putUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });
        if (!putRes.ok) {
          toast.error(labels.errors.uploadFailed);
          return;
        }
        storagePaths = [presign.storageKey];
      }

      const result = await createProjectDeliverableVersionAction({
        projectId,
        storagePaths,
        externalUrls: trimmedUrl ? [trimmedUrl] : [],
        note: note.trim() || undefined,
      });

      if (!result.ok) {
        toast.error(
          result.error === "forbidden" ? labels.errors.forbidden : labels.errors.generic,
        );
        return;
      }

      resetForm();
      toast.success(labels.success);
      router.refresh();
    });
  }

  return (
    <section className="space-y-5">
      <div className="rounded-lg border border-border/70 bg-surface-raised p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground keep-all">
              {labels.title}
            </h2>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground keep-all">
              {labels.subtitle}
            </p>
          </div>
          <div className="rounded-full border border-border bg-surface-card px-3 py-1 text-xs font-medium text-muted-foreground">
            {labels.versionsCount.replace(
              "{count}",
              String(sortedDeliverables.length),
            )}
          </div>
        </div>
      </div>

      {canUpload && (
        <div className="rounded-lg border border-border/70 bg-surface-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <PackagePlus className="h-4 w-4 text-brand" aria-hidden="true" />
            <h3 className="text-base font-semibold text-foreground">
              {labels.uploadTitle}
            </h3>
          </div>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="space-y-2">
              <Label htmlFor="version-file">{labels.uploadFile}</Label>
              <Input
                id="version-file"
                type="file"
                accept="image/*,video/*,application/pdf"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="version-url">{labels.uploadUrl}</Label>
              <Input
                id="version-url"
                type="url"
                value={externalUrl}
                onChange={(event) => setExternalUrl(event.target.value)}
                placeholder={labels.uploadUrlPlaceholder}
                disabled={isPending}
              />
            </div>
            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="version-note">{labels.uploadNote}</Label>
              <Textarea
                id="version-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder={labels.uploadNotePlaceholder}
                className="min-h-[88px] resize-none"
                disabled={isPending}
                maxLength={2000}
              />
            </div>
          </div>
          <Button
            type="button"
            onClick={submit}
            disabled={isPending}
            className="mt-4 gap-2 bg-brand text-brand-on hover:bg-brand/90"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Upload className="h-4 w-4" aria-hidden="true" />
            )}
            {isPending ? labels.uploadSubmitting : labels.uploadSubmit}
          </Button>
        </div>
      )}

      {sortedDeliverables.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/70 bg-surface-card px-4 py-14 text-center">
          <FileVideo className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <h3 className="mt-4 text-base font-semibold text-foreground keep-all">
            {labels.emptyTitle}
          </h3>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground keep-all">
            {labels.emptySub}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedDeliverables.map((deliverable) => (
            <VersionCard
              key={deliverable.id}
              deliverable={deliverable}
              locale={locale}
              labels={labels}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function VersionCard({
  deliverable,
  locale,
  labels,
}: {
  deliverable: VersionStackDeliverable;
  locale: string;
  labels: Labels;
}) {
  const assets = deliverable.storageAssets.length + deliverable.externalAssets.length;

  return (
    <article className="overflow-hidden rounded-lg border border-border/70 bg-surface-raised">
      <div className="flex flex-col gap-3 border-b border-border/70 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-lg font-semibold text-foreground">
              {labels.version.replace("{version}", String(deliverable.version))}
            </span>
            <span
              className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-label ${statusClass(
                deliverable.status,
              )}`}
            >
              {labels.status[deliverable.status] ?? deliverable.status}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>
              {labels.submittedBy}: {deliverable.submittedBy ?? "-"}
            </span>
            <span>
              {labels.submittedAt}: {formatDate(deliverable.createdAt, locale)}
            </span>
          </div>
        </div>
        <span className="rounded-full border border-border bg-surface-card px-2.5 py-1 text-xs text-muted-foreground">
          {labels.assets.replace("{count}", String(assets))}
        </span>
        <Link
          href={`?tab=comments&feedback=${deliverable.id}`}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface-card px-2.5 py-1 text-xs text-foreground transition-colors hover:border-brand hover:text-brand"
        >
          <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{labels.feedback}</span>
          <span className="text-muted-foreground">
            {labels.feedbackCount.replace(
              "{count}",
              String(deliverable.feedbackCount),
            )}
          </span>
        </Link>
      </div>

      <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="grid gap-3 md:grid-cols-2">
          {deliverable.storageAssets.map((asset) => (
            <StoragePreview key={asset.key} asset={asset} labels={labels} />
          ))}
          {deliverable.externalAssets.map((asset) => (
            <ExternalPreview key={asset.url} asset={asset} labels={labels} />
          ))}
        </div>
        <div className="rounded-lg border border-border/70 bg-background/40 p-4">
          {deliverable.note ? (
            <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground keep-all">
              {deliverable.note}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">{labels.noNote}</p>
          )}
        </div>
      </div>
    </article>
  );
}

function StoragePreview({
  asset,
  labels,
}: {
  asset: VersionStackDeliverable["storageAssets"][number];
  labels: Labels;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border/70 bg-background">
      <div className="flex aspect-video items-center justify-center bg-surface-card">
        {asset.kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element -- R2 public URL
          <img src={asset.url} alt="" className="h-full w-full object-cover" />
        ) : asset.kind === "video" ? (
          <video src={asset.url} className="h-full w-full object-cover" controls />
        ) : (
          <ImageIcon className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
        )}
      </div>
      <div className="flex items-center justify-between gap-3 p-3">
        <p className="min-w-0 truncate text-xs text-muted-foreground">
          {asset.key.split("/").at(-1) ?? labels.storedFile}
        </p>
        <a
          href={asset.url}
          download
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border px-2 py-1 text-xs text-foreground hover:border-brand hover:text-brand"
        >
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          {labels.download}
        </a>
      </div>
    </div>
  );
}

function ExternalPreview({
  asset,
  labels,
}: {
  asset: VersionStackDeliverable["externalAssets"][number];
  labels: Labels;
}) {
  const embedUrl =
    asset.provider === "youtube"
      ? getYouTubeEmbedUrl(asset.url)
      : asset.provider === "vimeo"
        ? getVimeoEmbedUrl(asset.url)
        : null;

  return (
    <div className="overflow-hidden rounded-lg border border-border/70 bg-background">
      <div className="aspect-video bg-surface-card">
        {embedUrl ? (
          <iframe
            src={embedUrl}
            title={asset.title ?? asset.url}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : asset.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- oEmbed thumbnail
          <img src={asset.thumbnailUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <LinkIcon className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-3 p-3">
        <p className="min-w-0 truncate text-xs text-muted-foreground">
          {asset.title ?? asset.url}
        </p>
        <a
          href={asset.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border px-2 py-1 text-xs text-foreground hover:border-brand hover:text-brand"
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          {labels.openExternal}
        </a>
      </div>
    </div>
  );
}
