"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type RevisionEntry = {
  id: string;
  url: string | null;
  caption: string | null;
  revision: number;
  media_type: string;
};

type Props = {
  current: RevisionEntry;
  historical: RevisionEntry[];
};

function MediaPreview({ entry }: { entry: RevisionEntry }) {
  if (!entry.url) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground">
        No media
      </div>
    );
  }

  if (entry.media_type === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={entry.url}
        alt={entry.caption ?? ""}
        className="w-full rounded-lg object-contain max-h-72"
      />
    );
  }

  if (entry.media_type === "video_upload") {
    return (
      <video
        src={entry.url}
        controls
        className="w-full rounded-lg max-h-72"
      />
    );
  }

  return (
    <div className="flex h-48 items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground">
      {entry.media_type}
    </div>
  );
}

export function RevisionCompare({ current, historical }: Props) {
  const t = useTranslations("revisions");
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  if (historical.length === 0) return null;

  const activeHistorical = historical[activeIdx] ?? historical[0]!;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-input px-3 py-1.5 text-sm font-medium hover:border-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        {t("see_changes")}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4">
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg bg-background p-6 shadow-xl">
            <button
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 rounded-full p-1 hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="mb-4 text-lg font-semibold">
              {t("compare_side_by_side")}
            </h2>

            {/* Tab selector when multiple historical revisions */}
            {historical.length > 1 && (
              <div className="mb-4 flex gap-2 flex-wrap">
                {historical.map((h, idx) => (
                  <button
                    key={h.id}
                    onClick={() => setActiveIdx(idx)}
                    className={cn(
                      "rounded-full px-3 py-1 text-sm font-medium border transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                      activeIdx === idx
                        ? "bg-foreground text-background border-foreground"
                        : "border-input hover:border-foreground",
                    )}
                  >
                    {t("revision_n", { n: h.revision })}
                  </button>
                ))}
              </div>
            )}

            {/* Side-by-side comparison */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {/* Historical (older) */}
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("revision_n", { n: activeHistorical.revision })}
                </p>
                <MediaPreview entry={activeHistorical} />
                {activeHistorical.caption && (
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground [word-break:keep-all]">
                    {activeHistorical.caption}
                  </p>
                )}
              </div>

              {/* Current */}
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("revision_current")}
                </p>
                <MediaPreview entry={current} />
                {current.caption && (
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground [word-break:keep-all]">
                    {current.caption}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
