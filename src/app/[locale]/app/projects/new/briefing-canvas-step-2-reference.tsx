"use client";

// =============================================================================
// Phase 5 Wave B task_05 v3 — Step 2 center column (레퍼런스 / reference docs)
//
// URL paste → /api/oembed proxy → addBriefingDocumentAction. Each row
// displays thumbnail (when available) + URL + category chip + memo
// textarea + delete X. Memo and category mutate via
// updateBriefingDocumentNoteAction (1s debounce on memo).
// =============================================================================

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Link as LinkIcon, X } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  addBriefingDocumentAction,
  removeBriefingDocumentAction,
  updateBriefingDocumentNoteAction,
} from "./briefing-step2-actions";

export type ReferenceDoc = {
  id: string;
  url: string | null;
  provider: string | null;
  thumbnail_url: string | null;
  note: string | null;
  category: "mood" | "composition" | "pacing" | "general" | string | null;
};

const CATEGORY_OPTIONS = ["mood", "composition", "pacing", "general"] as const;

export function Step2ReferenceColumn({
  projectId,
  documents,
  onAdded,
  onRemoved,
  onUpdated,
}: {
  projectId: string;
  documents: ReferenceDoc[];
  onAdded: (doc: ReferenceDoc) => void;
  onRemoved: (id: string) => void;
  onUpdated: (id: string, patch: Partial<ReferenceDoc>) => void;
}) {
  const t = useTranslations("projects");
  const [urlValue, setUrlValue] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleAdd() {
    const trimmed = urlValue.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      let provider:
        | "youtube"
        | "vimeo"
        | "instagram"
        | "generic"
        | undefined;
      let thumbnail_url: string | undefined;

      try {
        const res = await fetch(
          `/api/oembed?url=${encodeURIComponent(trimmed)}`,
          { signal: AbortSignal.timeout(8_000) },
        );
        if (res.ok) {
          const meta = (await res.json()) as {
            provider?: typeof provider;
            thumbnail_url?: string | null;
          };
          provider = meta.provider;
          thumbnail_url = meta.thumbnail_url ?? undefined;
        }
      } catch {
        // oembed failure is non-fatal — store the URL with no thumbnail
      }

      const insert = await addBriefingDocumentAction({
        projectId,
        kind: "reference",
        source_type: "url",
        url: trimmed,
        provider,
        thumbnail_url,
        category: "general",
      });
      if (!insert.ok) {
        toast.error(t("briefing.step2.toast.add_failed"));
        return;
      }
      onAdded({
        id: insert.document.id,
        url: insert.document.url,
        provider: insert.document.provider,
        thumbnail_url: insert.document.thumbnail_url,
        note: insert.document.note,
        category: insert.document.category,
      });
      setUrlValue("");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(id: string) {
    const res = await removeBriefingDocumentAction({ documentId: id });
    if (!res.ok) {
      toast.error(t("briefing.step2.toast.remove_failed"));
      return;
    }
    onRemoved(id);
  }

  return (
    <section className="rounded-3xl border border-border/40 p-6 bg-background flex flex-col gap-5">
      <header>
        <h2 className="text-base font-semibold tracking-tight keep-all">
          {t("briefing.step2.sections.reference.title")}
        </h2>
        <p className="text-xs text-muted-foreground mt-1.5 keep-all leading-relaxed">
          {t("briefing.step2.sections.reference.helper")}
        </p>
      </header>

      <div className="flex gap-2">
        <Input
          type="url"
          placeholder={t(
            "briefing.step2.sections.reference.url_input_placeholder",
          )}
          value={urlValue}
          onChange={(e) => setUrlValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleAdd();
          }}
          className="flex-1"
        />
        <Button
          type="button"
          size="sm"
          onClick={handleAdd}
          disabled={busy || !urlValue.trim()}
        >
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            t("briefing.step2.sections.reference.add_cta")
          )}
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {documents.length === 0 ? (
          <p className="text-xs text-muted-foreground keep-all">
            {t("briefing.step2.sections.reference.list_empty")}
          </p>
        ) : (
          documents.map((doc) => (
            <ReferenceRow
              key={doc.id}
              doc={doc}
              onUpdated={(patch) => onUpdated(doc.id, patch)}
              onRemove={() => void handleRemove(doc.id)}
            />
          ))
        )}
      </div>
    </section>
  );
}

function ReferenceRow({
  doc,
  onUpdated,
  onRemove,
}: {
  doc: ReferenceDoc;
  onUpdated: (patch: Partial<ReferenceDoc>) => void;
  onRemove: () => void;
}) {
  const t = useTranslations("projects");
  const [noteValue, setNoteValue] = useState(doc.note ?? "");
  const [category, setCategory] = useState<string>(doc.category ?? "general");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 1s debounce on note text. Category change persists immediately.
  useEffect(() => {
    if (noteValue === (doc.note ?? "")) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const res = await updateBriefingDocumentNoteAction({
        documentId: doc.id,
        note: noteValue || null,
      });
      if (res.ok) onUpdated({ note: noteValue || null });
    }, 1000);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onUpdated is unstable
  }, [noteValue, doc.id, doc.note]);

  async function handleCategoryChange(next: string) {
    setCategory(next);
    const res = await updateBriefingDocumentNoteAction({
      documentId: doc.id,
      category: next as "mood" | "composition" | "pacing" | "general",
    });
    if (res.ok) onUpdated({ category: next });
  }

  return (
    <div className="flex flex-col gap-2 p-3 rounded-xl border border-border/40">
      <div className="flex items-start gap-3">
        {doc.thumbnail_url ? (
          <div className="w-20 h-14 shrink-0 rounded-lg overflow-hidden relative bg-muted">
            <Image
              src={doc.thumbnail_url}
              alt=""
              fill
              sizes="80px"
              className="object-cover"
              unoptimized
            />
          </div>
        ) : (
          <div className="w-20 h-14 shrink-0 rounded-lg bg-muted flex items-center justify-center">
            <LinkIcon className="w-5 h-5 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <a
            href={doc.url ?? "#"}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-muted-foreground truncate hover:underline underline-offset-4"
          >
            {doc.url}
          </a>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORY_OPTIONS.map((opt) => {
              const selected = category === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => void handleCategoryChange(opt)}
                  aria-pressed={selected}
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors",
                    selected
                      ? "bg-foreground text-background"
                      : "border border-border/60 hover:border-border",
                  )}
                >
                  {t(
                    `briefing.step2.sections.reference.categories.${opt}` as Parameters<
                      typeof t
                    >[0],
                  )}
                </button>
              );
            })}
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="p-1 rounded hover:bg-muted transition-colors shrink-0"
          aria-label="Remove"
        >
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>
      <Textarea
        value={noteValue}
        onChange={(e) => setNoteValue(e.target.value)}
        placeholder={t(
          "briefing.step2.sections.reference.note_placeholder",
        )}
        rows={2}
        className="resize-none text-xs"
      />
    </div>
  );
}
