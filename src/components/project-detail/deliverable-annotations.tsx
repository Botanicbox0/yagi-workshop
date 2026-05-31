"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { Check, CheckCircle2, MessageSquare, MousePointer2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ThreadPanel, type ThreadMessage } from "@/components/project/thread-panel";
import {
  createDeliverableAnnotationAction,
  setDeliverableAnnotationStatusAction,
} from "@/app/[locale]/app/projects/[id]/annotation-actions";
import { cn } from "@/lib/utils";

export type AnnotationShape = "pin" | "box";
export type AnnotationStatus = "open" | "resolved";
export type AnnotationVisibility = "client" | "internal";

export type AnnotationCoords =
  | { x: number; y: number }
  | { x: number; y: number; w: number; h: number };

export type DeliverableAnnotation = {
  id: string;
  projectId: string;
  deliverableId: string;
  assetIndex: number;
  seq: number;
  shape: AnnotationShape;
  coords: AnnotationCoords;
  visibility: AnnotationVisibility;
  status: AnnotationStatus;
  threadId: string;
  createdAt: string;
  createdBy: string;
  preview: string | null;
  messageCount: number;
  messages: ThreadMessage[];
};

export type AnnotationLabels = {
  title: string;
  subtitle: string;
  hint: string;
  draftTitle: string;
  bodyPlaceholder: string;
  save: string;
  saving: string;
  cancel: string;
  listEmpty: string;
  open: string;
  resolved: string;
  resolve: string;
  reopen: string;
  threadTitle: string;
  clientVisibility: string;
  internalVisibility: string;
  errors: {
    validation: string;
    forbidden: string;
    generic: string;
  };
};

type DraftAnnotation = {
  assetIndex: number;
  shape: AnnotationShape;
  coords: AnnotationCoords;
};

type ImageAnnotationProps = {
  assetIndex: number;
  src: string;
  alt: string;
  annotations: DeliverableAnnotation[];
  selectedId: string | null;
  draft: DraftAnnotation | null;
  labels: AnnotationLabels;
  onSelect: (id: string) => void;
  onDraft: (draft: DraftAnnotation) => void;
};

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function coordsFromPointer(
  event: React.PointerEvent<HTMLElement>,
  element: HTMLElement,
) {
  const rect = element.getBoundingClientRect();
  return {
    x: clamp01((event.clientX - rect.left) / rect.width),
    y: clamp01((event.clientY - rect.top) / rect.height),
  };
}

export function AnnotatedImage({
  assetIndex,
  src,
  alt,
  annotations,
  selectedId,
  draft,
  labels,
  onSelect,
  onDraft,
}: ImageAnnotationProps) {
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const pointerRef = useRef<number | null>(null);
  const localDraft = draft?.assetIndex === assetIndex ? draft : null;

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    const point = coordsFromPointer(event, event.currentTarget);
    startRef.current = point;
    pointerRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (pointerRef.current !== event.pointerId || !startRef.current) return;
    const start = startRef.current;
    const end = coordsFromPointer(event, event.currentTarget);
    startRef.current = null;
    pointerRef.current = null;

    const dx = Math.abs(end.x - start.x);
    const dy = Math.abs(end.y - start.y);
    if (dx < 0.012 && dy < 0.012) {
      onDraft({ assetIndex, shape: "pin", coords: end });
      return;
    }

    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    const w = Math.max(dx, 0.01);
    const h = Math.max(dy, 0.01);
    onDraft({
      assetIndex,
      shape: "box",
      coords: { x, y, w: Math.min(w, 1 - x), h: Math.min(h, 1 - y) },
    });
  }

  return (
    <div className="w-full space-y-2">
      <div className="flex min-h-[220px] items-center justify-center bg-surface-card sm:min-h-[280px]">
        <div
          className="group relative max-h-[72vh] max-w-full touch-manipulation select-none"
          data-testid={`annotation-image-${assetIndex}`}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- R2 public URL */}
          <img
            src={src}
            alt={alt}
            className="block max-h-[72vh] max-w-full object-contain"
            draggable={false}
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/35 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          <div className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/80 px-2 py-1 text-[11px] text-muted-foreground backdrop-blur">
            <MousePointer2 className="h-3 w-3" aria-hidden="true" />
            {labels.hint}
          </div>
          {annotations.map((annotation) => (
            <AnnotationMarker
              key={annotation.id}
              annotation={annotation}
              selected={annotation.id === selectedId}
              onSelect={onSelect}
              labels={labels}
            />
          ))}
          {localDraft ? <DraftMarker draft={localDraft} /> : null}
        </div>
      </div>
    </div>
  );
}

function AnnotationMarker({
  annotation,
  selected,
  labels,
  onSelect,
}: {
  annotation: DeliverableAnnotation;
  selected: boolean;
  labels: AnnotationLabels;
  onSelect: (id: string) => void;
}) {
  const isResolved = annotation.status === "resolved";
  const coords = annotation.coords;
  const content = (
    <span
      className={cn(
        "flex h-7 min-w-7 items-center justify-center rounded-full border px-2 text-xs font-bold shadow-lg transition-transform",
        isResolved
          ? "border-border bg-muted text-muted-foreground"
          : "border-brand bg-brand text-brand-on",
        selected && "scale-110 ring-2 ring-gold",
      )}
    >
      {isResolved ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : annotation.seq}
    </span>
  );

  if (annotation.shape === "box" && "w" in coords) {
    return (
      <button
        type="button"
        className={cn(
          "group/marker absolute border-2 text-left transition-colors",
          isResolved ? "border-muted-foreground/70" : "border-brand",
          selected && "ring-2 ring-gold",
        )}
        style={{
          left: `${coords.x * 100}%`,
          top: `${coords.y * 100}%`,
          width: `${coords.w * 100}%`,
          height: `${coords.h * 100}%`,
        }}
        data-testid={`annotation-marker-${annotation.seq}`}
        onClick={(event) => {
          event.stopPropagation();
          onSelect(annotation.id);
        }}
        onPointerDown={(event) => event.stopPropagation()}
        onPointerUp={(event) => event.stopPropagation()}
        aria-label={`Annotation ${annotation.seq}`}
      >
        <span className="absolute -left-3 -top-3">{content}</span>
        <Tooltip annotation={annotation} labels={labels} />
      </button>
    );
  }

  return (
    <button
      type="button"
      className="group/marker absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${coords.x * 100}%`, top: `${coords.y * 100}%` }}
      data-testid={`annotation-marker-${annotation.seq}`}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(annotation.id);
      }}
      onPointerDown={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()}
      aria-label={`Annotation ${annotation.seq}`}
    >
      {content}
      <Tooltip annotation={annotation} labels={labels} />
    </button>
  );
}

function Tooltip({
  annotation,
  labels,
}: {
  annotation: DeliverableAnnotation;
  labels: AnnotationLabels;
}) {
  return (
    <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 hidden w-56 -translate-x-1/2 rounded-md border border-border bg-background/95 p-3 text-left shadow-xl group-hover/marker:block">
      <span className="block text-xs font-semibold text-foreground">
        #{annotation.seq} · {annotation.status === "resolved" ? labels.resolved : labels.open}
      </span>
      <span className="mt-1 line-clamp-2 block text-xs leading-5 text-muted-foreground">
        {annotation.preview ?? labels.listEmpty}
      </span>
    </span>
  );
}

function DraftMarker({ draft }: { draft: DraftAnnotation }) {
  const coords = draft.coords;
  if (draft.shape === "box" && "w" in coords) {
    return (
      <div
        className="pointer-events-none absolute border-2 border-dashed border-gold"
        data-testid="annotation-draft"
        style={{
          left: `${coords.x * 100}%`,
          top: `${coords.y * 100}%`,
          width: `${coords.w * 100}%`,
          height: `${coords.h * 100}%`,
        }}
      />
    );
  }

  return (
    <div
      className="pointer-events-none absolute h-7 min-w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold bg-gold px-2 text-center text-xs font-bold leading-7 text-gold-on"
      style={{ left: `${coords.x * 100}%`, top: `${coords.y * 100}%` }}
      data-testid="annotation-draft"
    >
      +
    </div>
  );
}

export function AnnotationPanel({
  projectId,
  deliverableId,
  currentUserId,
  isYagiAdmin,
  annotations,
  selectedId,
  draft,
  labels,
  onSelect,
  onCancelDraft,
}: {
  projectId: string;
  deliverableId: string;
  currentUserId: string;
  isYagiAdmin: boolean;
  annotations: DeliverableAnnotation[];
  selectedId: string | null;
  draft: DraftAnnotation | null;
  labels: AnnotationLabels;
  onSelect: (id: string | null) => void;
  onCancelDraft: () => void;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [internal, setInternal] = useState(false);
  const [isPending, startTransition] = useTransition();
  const sorted = useMemo(
    () => [...annotations].sort((a, b) => a.assetIndex - b.assetIndex || a.seq - b.seq),
    [annotations],
  );
  const selected = sorted.find((annotation) => annotation.id === selectedId) ?? null;
  const openCount = sorted.filter((annotation) => annotation.status === "open").length;

  function saveDraft() {
    if (!draft || body.trim().length === 0 || isPending) return;
    startTransition(async () => {
      const result = await createDeliverableAnnotationAction({
        projectId,
        deliverableId,
        assetIndex: draft.assetIndex,
        shape: draft.shape,
        coords: draft.coords,
        visibility: isYagiAdmin && internal ? "internal" : "client",
        body,
      });
      if (!result.ok) {
        if (result.error === "validation") toast.error(labels.errors.validation);
        else if (result.error === "forbidden") toast.error(labels.errors.forbidden);
        else toast.error(labels.errors.generic);
        return;
      }
      setBody("");
      setInternal(false);
      onCancelDraft();
      onSelect(result.annotationId);
      router.refresh();
    });
  }

  function setStatus(annotation: DeliverableAnnotation, status: AnnotationStatus) {
    startTransition(async () => {
      const result = await setDeliverableAnnotationStatusAction({
        projectId,
        annotationId: annotation.id,
        status,
      });
      if (!result.ok) {
        toast.error(
          result.error === "forbidden" ? labels.errors.forbidden : labels.errors.generic,
        );
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border/70 bg-background/40 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-label text-muted-foreground">
              {labels.title}
            </p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground keep-all">
              {labels.subtitle}
            </p>
          </div>
          <span className="rounded-full border border-brand/30 bg-brand-soft px-2 py-1 text-xs font-semibold text-brand">
            {openCount}
          </span>
        </div>
      </div>

      {draft ? (
        <div className="rounded-lg border border-gold/40 bg-gold/10 p-4">
          <p className="text-sm font-semibold text-foreground">{labels.draftTitle}</p>
          <Textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder={labels.bodyPlaceholder}
            className="mt-3 min-h-[92px] resize-none bg-background"
            maxLength={10_000}
          />
          {isYagiAdmin ? (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-md border border-border/70 bg-background/60 px-3 py-2">
              <Label htmlFor={`annotation-internal-${deliverableId}`} className="text-xs">
                {internal ? labels.internalVisibility : labels.clientVisibility}
              </Label>
              <Switch
                id={`annotation-internal-${deliverableId}`}
                checked={internal}
                onCheckedChange={setInternal}
              />
            </div>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={saveDraft}
              disabled={isPending || body.trim().length === 0}
              className="gap-2 bg-brand text-brand-on hover:bg-brand/90"
            >
              <MessageSquare className="h-4 w-4" aria-hidden="true" />
              {isPending ? labels.saving : labels.save}
            </Button>
            <Button type="button" variant="outline" onClick={onCancelDraft}>
              {labels.cancel}
            </Button>
          </div>
        </div>
      ) : null}

      {sorted.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/70 bg-background/30 p-4 text-sm text-muted-foreground keep-all">
          {labels.listEmpty}
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((annotation) => (
            <button
              key={annotation.id}
              type="button"
              onClick={() => onSelect(annotation.id)}
              className={cn(
                "w-full rounded-lg border p-3 text-left transition-colors",
                selectedId === annotation.id
                  ? "border-brand bg-brand-soft"
                  : "border-border/70 bg-background/40 hover:border-brand/70",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                  <span
                    className={cn(
                      "inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs",
                      annotation.status === "resolved"
                        ? "bg-muted text-muted-foreground"
                        : "bg-brand text-brand-on",
                    )}
                  >
                    {annotation.status === "resolved" ? (
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      annotation.seq
                    )}
                  </span>
                  #{annotation.seq}
                </span>
                <span className="text-xs text-muted-foreground">
                  {annotation.status === "resolved" ? labels.resolved : labels.open}
                </span>
              </div>
              <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
                {annotation.preview ?? labels.listEmpty}
              </p>
            </button>
          ))}
        </div>
      )}

      {selected ? (
        <div className="rounded-lg border border-border/70 bg-background/40 p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-foreground">
              {labels.threadTitle} #{selected.seq}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() =>
                setStatus(
                  selected,
                  selected.status === "resolved" ? "open" : "resolved",
                )
              }
            >
              {selected.status === "resolved" ? labels.reopen : labels.resolve}
            </Button>
          </div>
          <ThreadPanel
            key={selected.id}
            projectId={projectId}
            annotationId={selected.id}
            annotationVisibility={selected.visibility}
            threadId={selected.threadId}
            currentUserId={currentUserId}
            isYagiAdmin={isYagiAdmin}
            initialMessages={selected.messages}
          />
        </div>
      ) : null}
    </div>
  );
}
