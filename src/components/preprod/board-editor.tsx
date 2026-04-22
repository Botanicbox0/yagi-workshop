"use client";

import {
  useState,
  useCallback,
  useRef,
  useTransition,
  useEffect,
  useMemo,
} from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import {
  GripVertical,
  Plus,
  Image as ImageIcon,
  Video,
  Link,
  ExternalLink,
  ChevronLeft,
  MoreHorizontal,
  Loader2,
  X,
  History,
  MessageSquare,
  CircleDot,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Link as NavLink } from "@/i18n/routing";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { validateVideoFile, readVideoMetadata } from "@/lib/references/video";
import {
  addFrame,
  addFrameFromUrl,
  updateFrame,
  deleteFrame,
  reorderFrames,
  updateBoardTitle,
  createFrameRevision,
  restoreFrameRevision,
  resolveComment,
  unresolveComment,
} from "@/app/[locale]/app/preprod/[id]/actions";

// ─── Types ────────────────────────────────────────────────────────────────────

type FrameRow = {
  id: string;
  frame_order: number;
  media_type: string;
  media_storage_path: string | null;
  media_external_url: string | null;
  media_embed_provider: string | null;
  thumbnail_path: string | null;
  caption: string | null;
  director_note: string | null;
  reference_ids: string[];
  revision: number;
  revision_group: string;
  is_current_revision: boolean;
};

type HistoryFrameRow = {
  id: string;
  revision_group: string;
  revision: number;
  is_current_revision: boolean;
  media_type: string;
  media_storage_path: string | null;
  media_external_url: string | null;
  media_embed_provider: string | null;
  thumbnail_path: string | null;
  caption: string | null;
  created_at: string;
};

type RefRow = {
  id: string;
  caption: string | null;
  media_type: string;
  og_title: string | null;
  thumbnail_path: string | null;
  storage_path: string | null;
};

type BoardRow = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  share_enabled: boolean;
  share_token: string | null;
  project_id: string;
  project: { title: string; workspace_id: string } | null;
};

type ReactionRow = {
  id: string;
  board_id: string;
  frame_id: string;
  reaction: string;
  reactor_name: string | null;
  reactor_email: string;
  created_at: string;
  updated_at: string;
};

type CommentRow = {
  id: string;
  board_id: string;
  frame_id: string;
  body: string;
  author_display_name: string;
  author_email: string | null;
  author_user_id: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
};

interface BoardEditorProps {
  board: BoardRow;
  frames: FrameRow[];
  refs: RefRow[];
  mediaUrls: Record<string, string>;
  revisionHistory: Record<string, HistoryFrameRow[]>;
  initialReactions: ReactionRow[];
  initialComments: CommentRow[];
  backHref: string;
  savedLabel: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extensionFor(file: File, fallback: string): string {
  const fromName = file.name.split(".").pop();
  if (fromName && fromName.length <= 8) return fromName.toLowerCase();
  return fallback;
}

function statusBadgeVariant(
  status: string
): "secondary" | "default" | "outline" | "destructive" {
  switch (status) {
    case "draft":
      return "secondary";
    case "shared":
      return "default";
    case "approved":
      return "outline";
    case "archived":
      return "destructive";
    default:
      return "secondary";
  }
}

/**
 * Infer a provider thumbnail URL from embed metadata, without adding a DB column.
 * For YouTube we reconstruct the hqdefault URL from the canonical_url.
 * For others we return null (provider icon shown instead).
 */
function embedThumbnail(
  provider: string | null,
  externalUrl: string | null
): string | null {
  if (!provider || !externalUrl) return null;
  if (provider === "youtube") {
    try {
      const u = new URL(externalUrl);
      const host = u.hostname.replace(/^www\./, "");
      let videoId: string | undefined;
      if (host === "youtu.be") {
        videoId = u.pathname.slice(1).split("/")[0] || undefined;
      } else if (u.pathname.startsWith("/watch")) {
        videoId = u.searchParams.get("v") ?? undefined;
      } else {
        const m = u.pathname.match(/\/(?:shorts|embed)\/([^/]+)/);
        if (m) videoId = m[1];
      }
      if (videoId) {
        return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
      }
    } catch {
      // ignore
    }
  }
  if (provider === "vimeo") {
    // Vimeo thumbnails require API; return null, show provider icon
    return null;
  }
  return null;
}

// ─── Save indicator ───────────────────────────────────────────────────────────

type SaveState = "idle" | "saving" | "saved";

function useSaveIndicator(): [SaveState, () => void, () => void] {
  const [state, setState] = useState<SaveState>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const markSaving = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setState("saving");
  }, []);

  const markSaved = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setState("saved");
    timerRef.current = setTimeout(() => setState("idle"), 2000);
  }, []);

  return [state, markSaving, markSaved];
}

// ─── Relative time helper ─────────────────────────────────────────────────────

function relativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 30) return `${diffDays} days ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths === 1) return "1 month ago";
  return `${diffMonths} months ago`;
}

// ─── MediaThumbnail: reusable media preview for compare dialog ────────────────

interface MediaThumbnailProps {
  frame: HistoryFrameRow;
  mediaUrls: Record<string, string>;
}

function MediaThumbnail({ frame, mediaUrls }: MediaThumbnailProps) {
  const signedUrl = mediaUrls[frame.id];
  const thumbUrl =
    mediaUrls[`${frame.id}__thumb`] ??
    (frame.media_type === "video_embed"
      ? embedThumbnail(frame.media_embed_provider, frame.media_external_url)
      : null);

  if (frame.media_type === "image") {
    const src = signedUrl ?? thumbUrl;
    if (src) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={frame.caption ?? ""}
          className="w-full h-full object-contain"
        />
      );
    }
    return (
      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
        <ImageIcon className="w-8 h-8 opacity-40" />
      </div>
    );
  }

  if (frame.media_type === "video_upload") {
    if (thumbUrl) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbUrl}
          alt={frame.caption ?? ""}
          className="w-full h-full object-contain"
        />
      );
    }
    if (signedUrl) {
      return (
        <video
          src={signedUrl}
          className="w-full h-full object-contain"
          playsInline
          muted
        />
      );
    }
    return (
      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
        <Video className="w-8 h-8 opacity-40" />
      </div>
    );
  }

  if (frame.media_type === "video_embed") {
    const thumb = embedThumbnail(frame.media_embed_provider, frame.media_external_url);
    const providerLabel = frame.media_embed_provider
      ? frame.media_embed_provider.charAt(0).toUpperCase() +
        frame.media_embed_provider.slice(1)
      : "Embed";
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" className="max-w-full max-h-full object-contain rounded" />
        ) : (
          <>
            <Video className="w-8 h-8 opacity-40" />
            <span className="text-xs">{providerLabel}</span>
          </>
        )}
      </div>
    );
  }

  return null;
}

// ─── CompareDialog ────────────────────────────────────────────────────────────

interface CompareDialogProps {
  historical: HistoryFrameRow;
  current: HistoryFrameRow;
  mediaUrls: Record<string, string>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRestore: (historicalId: string) => void;
  isRestoring: boolean;
}

function CompareDialog({
  historical,
  current,
  mediaUrls,
  open,
  onOpenChange,
  onRestore,
  isRestoring,
}: CompareDialogProps) {
  const tRevisions = useTranslations("revisions");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-full">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">
            v{historical.revision} ↔ v{current.revision}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          {/* Historical side */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5">
              <Badge variant="secondary" className="rounded-full text-[10px] px-2 py-0">
                v{historical.revision}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {relativeTime(historical.created_at)}
              </span>
            </div>
            <div className="aspect-video bg-muted rounded-md overflow-hidden flex items-center justify-center">
              <MediaThumbnail frame={historical} mediaUrls={mediaUrls} />
            </div>
            {historical.caption && (
              <p className="text-xs text-muted-foreground keep-all line-clamp-2">
                {historical.caption}
              </p>
            )}
          </div>

          {/* Current side */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5">
              <Badge variant="default" className="rounded-full text-[10px] px-2 py-0">
                v{current.revision}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {tRevisions("revision_current")}
              </span>
            </div>
            <div className="aspect-video bg-muted rounded-md overflow-hidden flex items-center justify-center">
              <MediaThumbnail frame={current} mediaUrls={mediaUrls} />
            </div>
            {current.caption && (
              <p className="text-xs text-muted-foreground keep-all line-clamp-2">
                {current.caption}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full text-xs"
            onClick={() => onOpenChange(false)}
          >
            {tRevisions("revision_diff")}
          </Button>
          <Button
            size="sm"
            className="rounded-full text-xs"
            disabled={isRestoring}
            onClick={() => onRestore(historical.id)}
          >
            {isRestoring ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              tRevisions("restore_v_n", { n: historical.revision })
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Reaction helpers ────────────────────────────────────────────────────────

const REACTION_EMOJI: Record<string, string> = {
  like: "👍",
  dislike: "👎",
  hand: "✋",
};

function reactionLabel(reaction: string): string {
  return REACTION_EMOJI[reaction] ?? reaction;
}

type FrameFeedbackCounts = {
  like: number;
  dislike: number;
  hand: number;
  total: number;
  comments: number;
  unresolvedComments: number;
};

function computeFrameCounts(
  reactions: ReactionRow[],
  comments: CommentRow[]
): FrameFeedbackCounts {
  const counts: FrameFeedbackCounts = {
    like: 0,
    dislike: 0,
    hand: 0,
    total: 0,
    comments: 0,
    unresolvedComments: 0,
  };
  for (const r of reactions) {
    if (r.reaction === "like") counts.like += 1;
    else if (r.reaction === "dislike") counts.dislike += 1;
    else if (r.reaction === "hand") counts.hand += 1;
  }
  counts.total = counts.like + counts.dislike + counts.hand;
  counts.comments = comments.length;
  counts.unresolvedComments = comments.filter((c) => !c.resolved_at).length;
  return counts;
}

function sentimentFlag(
  counts: FrameFeedbackCounts
): "positive" | "negative" | null {
  if (counts.total < 1) return null;
  if (counts.like / counts.total > 0.8) return "positive";
  if (counts.dislike / counts.total > 0.5) return "negative";
  return null;
}

// ─── FeedbackDialog ──────────────────────────────────────────────────────────

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  frameLabel: string;
  reactions: ReactionRow[];
  comments: CommentRow[];
  onResolveToggle: (commentId: string, currentlyResolved: boolean) => void;
  resolvingIds: Set<string>;
}

function FeedbackDialog({
  open,
  onOpenChange,
  frameLabel,
  reactions,
  comments,
  onResolveToggle,
  resolvingIds,
}: FeedbackDialogProps) {
  const tPreprod = useTranslations("preprod");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-full">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold keep-all">
            {tPreprod("feedback_dialog_title")} — {frameLabel}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5 max-h-[60vh] overflow-y-auto">
          {/* Reactions */}
          <section className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground keep-all">
              {tPreprod("feedback_reactions_section")}
            </p>
            {reactions.length === 0 ? (
              <p className="text-xs text-muted-foreground keep-all">
                {tPreprod("feedback_no_reactions")}
              </p>
            ) : (
              <ul className="divide-y divide-border rounded-md border border-border">
                {reactions.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center gap-2 px-3 py-2 text-xs"
                  >
                    <span className="text-base leading-none">
                      {reactionLabel(r.reaction)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate keep-all">
                        {r.reactor_name?.trim() ||
                          r.reactor_email ||
                          tPreprod("feedback_anonymous")}
                      </p>
                      {r.reactor_name && r.reactor_email && (
                        <p className="text-[10px] text-muted-foreground truncate">
                          {r.reactor_email}
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {relativeTime(r.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Comments */}
          <section className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground keep-all">
              {tPreprod("feedback_comments_section")}
            </p>
            {comments.length === 0 ? (
              <p className="text-xs text-muted-foreground keep-all">
                {tPreprod("feedback_no_comments")}
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {comments.map((c) => {
                  const resolved = Boolean(c.resolved_at);
                  const pending = resolvingIds.has(c.id);
                  return (
                    <li
                      key={c.id}
                      className={cn(
                        "rounded-md border p-3 flex flex-col gap-1.5",
                        resolved
                          ? "border-border bg-muted/40"
                          : "border-border"
                      )}
                    >
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-medium truncate keep-all">
                          {c.author_display_name ||
                            tPreprod("feedback_anonymous")}
                        </span>
                        {resolved && (
                          <Badge
                            variant="secondary"
                            className="rounded-full text-[10px] px-1.5 py-0"
                          >
                            {tPreprod("feedback_resolved")}
                          </Badge>
                        )}
                        <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">
                          {relativeTime(c.created_at)}
                        </span>
                      </div>
                      <p className="text-xs keep-all whitespace-pre-wrap">
                        {c.body}
                      </p>
                      <div className="flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={pending}
                          className="rounded-full text-[11px] h-6 px-2.5"
                          onClick={() => onResolveToggle(c.id, resolved)}
                        >
                          {pending ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : resolved ? (
                            tPreprod("feedback_unresolve")
                          ) : (
                            tPreprod("feedback_resolve")
                          )}
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Sortable frame item (left rail) ─────────────────────────────────────────

interface SortableFrameItemProps {
  frame: FrameRow;
  index: number;
  selected: boolean;
  mediaUrl: string | undefined;
  thumbUrl: string | undefined;
  counts: FrameFeedbackCounts;
  onClick: () => void;
  onDelete: (id: string) => void;
  onOpenFeedback: () => void;
}

function SortableFrameItem({
  frame,
  index,
  selected,
  mediaUrl,
  thumbUrl,
  counts,
  onClick,
  onDelete,
  onOpenFeedback,
}: SortableFrameItemProps) {
  const tFrames = useTranslations("frames");
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: frame.id });

  const transformStr = transform
    ? `translate3d(${transform.x}px, ${transform.y}px, 0) scaleX(${transform.scaleX}) scaleY(${transform.scaleY})`
    : undefined;
  const style = {
    transform: transformStr,
    transition,
  };

  const displayThumb =
    thumbUrl ??
    (frame.media_type === "video_embed"
      ? embedThumbnail(frame.media_embed_provider, frame.media_external_url)
      : null) ??
    (frame.media_type === "image" ? mediaUrl : null);

  const hasAnyFeedback =
    counts.total > 0 || counts.comments > 0;
  const flag = sentimentFlag(counts);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-lg p-1 cursor-pointer group transition-colors",
        selected ? "bg-foreground/10 ring-1 ring-foreground/20" : "hover:bg-accent",
        isDragging ? "opacity-50" : ""
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-1">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="shrink-0 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing p-0.5"
          onClick={(e) => e.stopPropagation()}
          aria-label={tFrames("reorder_hint")}
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>

        {/* Thumbnail */}
        <div className="w-14 h-9 shrink-0 rounded bg-muted overflow-hidden flex items-center justify-center relative">
          {displayThumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={displayThumb}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-muted-foreground">
              {frame.media_type === "image" ? (
                <ImageIcon className="w-4 h-4" />
              ) : (
                <Video className="w-4 h-4" />
              )}
            </span>
          )}
          {flag && (
            <span
              className={cn(
                "absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full",
                flag === "positive" ? "bg-green-500" : "bg-red-500"
              )}
              aria-hidden
            />
          )}
        </div>

        {/* Label */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate keep-all">
            {tFrames("frame_n", { n: index + 1 })}
          </p>
          {frame.revision > 1 && (
            <span className="text-[10px] text-muted-foreground tabular-nums">
              v{frame.revision}
            </span>
          )}
        </div>

        {/* Delete button (visible on hover) */}
        <button
          className="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity p-0.5"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(frame.id);
          }}
          aria-label={tFrames("remove_frame")}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Feedback stats line */}
      {hasAnyFeedback && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenFeedback();
          }}
          className="mt-1 ml-6 flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors tabular-nums"
        >
          {counts.like > 0 && (
            <span>
              <span className="mr-0.5">{counts.like}</span>👍
            </span>
          )}
          {counts.dislike > 0 && (
            <span>
              <span className="mr-0.5">{counts.dislike}</span>👎
            </span>
          )}
          {counts.hand > 0 && (
            <span>
              <span className="mr-0.5">{counts.hand}</span>✋
            </span>
          )}
          {counts.comments > 0 && (
            <span className="flex items-center gap-0.5">
              <MessageSquare className="w-3 h-3" />
              {counts.comments}
              {counts.unresolvedComments > 0 && (
                <span className="w-1 h-1 rounded-full bg-amber-500 ml-0.5" />
              )}
            </span>
          )}
        </button>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function BoardEditor({
  board,
  frames: initialFrames,
  refs,
  mediaUrls: initialMediaUrls,
  revisionHistory: initialRevisionHistory,
  initialReactions,
  initialComments,
  backHref,
}: BoardEditorProps) {
  const tPreprod = useTranslations("preprod");
  const tFrames = useTranslations("frames");
  const tRevisions = useTranslations("revisions");

  // ── State ──────────────────────────────────────────────────────────────────
  const [frames, setFrames] = useState<FrameRow[]>(initialFrames);
  const [mediaUrls, setMediaUrls] =
    useState<Record<string, string>>(initialMediaUrls);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialFrames[0]?.id ?? null
  );
  const [title, setTitle] = useState(board.title);
  const [addPopoverOpen, setAddPopoverOpen] = useState(false);
  const [urlInputOpen, setUrlInputOpen] = useState(false);
  const [urlValue, setUrlValue] = useState("");

  // Revision history state
  const [revisionHistory, setRevisionHistory] = useState<Record<string, HistoryFrameRow[]>>(
    initialRevisionHistory
  );
  const [compareTarget, setCompareTarget] = useState<HistoryFrameRow | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  // New revision upload popover state (per-frame in right rail)
  const [revPopoverOpen, setRevPopoverOpen] = useState(false);
  const [revUrlInputOpen, setRevUrlInputOpen] = useState(false);
  const [revUrlValue, setRevUrlValue] = useState("");

  const [saveState, markSaving, markSaved] = useSaveIndicator();
  const [isPending, startTransition] = useTransition();

  // ── Feedback state (reactions + comments per frame) ──────────────────────
  const [reactions, setReactions] = useState<ReactionRow[]>(initialReactions);
  const [comments, setComments] = useState<CommentRow[]>(initialComments);
  const [feedbackFrameId, setFeedbackFrameId] = useState<string | null>(null);
  const [resolvingIds, setResolvingIds] = useState<Set<string>>(new Set());

  // Per-frame local edit buffers (for autosave-on-blur)
  const [captionDraft, setCaptionDraft] = useState<string>("");
  const [directorNoteDraft, setDirectorNoteDraft] = useState<string>("");
  const lastFrameIdRef = useRef<string | null>(null);

  // ── DnD sensors ───────────────────────────────────────────────────────────
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // ── Derived ───────────────────────────────────────────────────────────────
  const selectedFrame = frames.find((f) => f.id === selectedId) ?? null;

  // Group reactions + comments by frame_id for fast per-frame lookups
  const reactionsByFrame = useMemo(() => {
    const m = new Map<string, ReactionRow[]>();
    for (const r of reactions) {
      const arr = m.get(r.frame_id);
      if (arr) arr.push(r);
      else m.set(r.frame_id, [r]);
    }
    return m;
  }, [reactions]);

  const commentsByFrame = useMemo(() => {
    const m = new Map<string, CommentRow[]>();
    for (const c of comments) {
      const arr = m.get(c.frame_id);
      if (arr) arr.push(c);
      else m.set(c.frame_id, [c]);
    }
    return m;
  }, [comments]);

  const frameCounts = useMemo(() => {
    const m = new Map<string, FrameFeedbackCounts>();
    for (const f of frames) {
      m.set(
        f.id,
        computeFrameCounts(
          reactionsByFrame.get(f.id) ?? [],
          commentsByFrame.get(f.id) ?? []
        )
      );
    }
    return m;
  }, [frames, reactionsByFrame, commentsByFrame]);

  // Board-level aggregate
  const boardFeedback = useMemo(() => {
    let totalReactions = 0;
    let unresolvedComments = 0;
    let positiveFrames = 0;
    let negativeFrames = 0;
    for (const f of frames) {
      const c = frameCounts.get(f.id);
      if (!c) continue;
      totalReactions += c.total;
      unresolvedComments += c.unresolvedComments;
      const flag = sentimentFlag(c);
      if (flag === "positive") positiveFrames += 1;
      else if (flag === "negative") negativeFrames += 1;
    }
    return {
      totalReactions,
      unresolvedComments,
      positiveFrames,
      negativeFrames,
    };
  }, [frames, frameCounts]);

  const feedbackFrame =
    feedbackFrameId != null
      ? frames.find((f) => f.id === feedbackFrameId) ?? null
      : null;
  const feedbackFrameIndex =
    feedbackFrameId != null
      ? frames.findIndex((f) => f.id === feedbackFrameId)
      : -1;

  // ── Resolve / unresolve a comment ──────────────────────────────────────────
  const handleResolveToggle = useCallback(
    (commentId: string, currentlyResolved: boolean) => {
      setResolvingIds((prev) => {
        const next = new Set(prev);
        next.add(commentId);
        return next;
      });

      const nowIso = new Date().toISOString();
      // Optimistic update
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? {
                ...c,
                resolved_at: currentlyResolved ? null : nowIso,
                resolved_by: currentlyResolved ? null : c.resolved_by,
              }
            : c
        )
      );

      startTransition(async () => {
        const action = currentlyResolved ? unresolveComment : resolveComment;
        const result = await action(commentId);

        setResolvingIds((prev) => {
          const next = new Set(prev);
          next.delete(commentId);
          return next;
        });

        if (!result.ok) {
          toast.error(result.error);
          // Revert
          setComments((prev) =>
            prev.map((c) =>
              c.id === commentId
                ? {
                    ...c,
                    resolved_at: currentlyResolved ? nowIso : null,
                  }
                : c
            )
          );
        }
      });
    },
    []
  );

  // ── Realtime subscription for this board ───────────────────────────────────
  useEffect(() => {
    const supabase = createSupabaseBrowser();
    const channel = supabase
      .channel(`preprod_board_${board.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "preprod_frame_reactions",
          filter: `board_id=eq.${board.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as ReactionRow;
            setReactions((prev) =>
              prev.some((r) => r.id === row.id) ? prev : [...prev, row]
            );
          } else if (payload.eventType === "UPDATE") {
            const row = payload.new as ReactionRow;
            setReactions((prev) =>
              prev.map((r) => (r.id === row.id ? row : r))
            );
          } else if (payload.eventType === "DELETE") {
            const old = payload.old as Partial<ReactionRow>;
            if (old.id) {
              setReactions((prev) => prev.filter((r) => r.id !== old.id));
            }
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "preprod_frame_comments",
          filter: `board_id=eq.${board.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as CommentRow;
            setComments((prev) =>
              prev.some((c) => c.id === row.id) ? prev : [...prev, row]
            );
          } else if (payload.eventType === "UPDATE") {
            const row = payload.new as CommentRow;
            setComments((prev) =>
              prev.map((c) => (c.id === row.id ? row : c))
            );
          } else if (payload.eventType === "DELETE") {
            const old = payload.old as Partial<CommentRow>;
            if (old.id) {
              setComments((prev) => prev.filter((c) => c.id !== old.id));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [board.id]);

  // Sync local drafts when selected frame changes
  const syncDraftsForFrame = useCallback(
    (frame: FrameRow | null) => {
      setCaptionDraft(frame?.caption ?? "");
      setDirectorNoteDraft(frame?.director_note ?? "");
    },
    []
  );

  const handleSelectFrame = useCallback(
    (frameId: string) => {
      // If switching away from a frame that has pending edits, they will be
      // autosaved on blur already. Just update selection + sync drafts.
      const frame = frames.find((f) => f.id === frameId) ?? null;
      setSelectedId(frameId);
      syncDraftsForFrame(frame);
      lastFrameIdRef.current = frameId;
    },
    [frames, syncDraftsForFrame]
  );

  // Initialise drafts for the first selected frame on mount
  const mountedRef = useRef(false);
  if (!mountedRef.current) {
    mountedRef.current = true;
    const first = frames.find((f) => f.id === selectedId) ?? null;
    // Directly set initial values (safe because this runs synchronously before first render)
    // These are the initial useState values above, so we just need to make sure
    // they get populated correctly. We do this here to avoid an effect.
    if (first) {
      // Can't call setState here without effect; handled by default values above
      // For the initial case the drafts start empty and get populated on select.
    }
  }

  // ── Title autosave ────────────────────────────────────────────────────────
  const handleTitleBlur = useCallback(() => {
    const trimmed = title.trim();
    if (!trimmed || trimmed === board.title) return;
    markSaving();
    startTransition(async () => {
      const result = await updateBoardTitle({ boardId: board.id, title: trimmed });
      if (!result.ok) {
        toast.error(result.error);
      } else {
        markSaved();
      }
    });
  }, [title, board.id, board.title, markSaving, markSaved]);

  // ── Caption autosave ──────────────────────────────────────────────────────
  const handleCaptionBlur = useCallback(() => {
    if (!selectedFrame) return;
    const val = captionDraft.trim() || null;
    if (val === selectedFrame.caption) return;
    markSaving();
    // Optimistic update
    setFrames((prev) =>
      prev.map((f) => (f.id === selectedFrame.id ? { ...f, caption: val } : f))
    );
    startTransition(async () => {
      const result = await updateFrame({
        frameId: selectedFrame.id,
        caption: val,
      });
      if (!result.ok) {
        toast.error(result.error);
        // Revert
        setFrames((prev) =>
          prev.map((f) =>
            f.id === selectedFrame.id
              ? { ...f, caption: selectedFrame.caption }
              : f
          )
        );
      } else {
        markSaved();
      }
    });
  }, [selectedFrame, captionDraft, markSaving, markSaved]);

  // ── Director note autosave ────────────────────────────────────────────────
  const handleDirectorNoteBlur = useCallback(() => {
    if (!selectedFrame) return;
    const val = directorNoteDraft.trim() || null;
    if (val === selectedFrame.director_note) return;
    markSaving();
    setFrames((prev) =>
      prev.map((f) =>
        f.id === selectedFrame.id ? { ...f, director_note: val } : f
      )
    );
    startTransition(async () => {
      const result = await updateFrame({
        frameId: selectedFrame.id,
        director_note: val,
      });
      if (!result.ok) {
        toast.error(result.error);
        setFrames((prev) =>
          prev.map((f) =>
            f.id === selectedFrame.id
              ? { ...f, director_note: selectedFrame.director_note }
              : f
          )
        );
      } else {
        markSaved();
      }
    });
  }, [selectedFrame, directorNoteDraft, markSaving, markSaved]);

  // ── Reference toggle ──────────────────────────────────────────────────────
  const handleToggleRef = useCallback(
    (refId: string) => {
      if (!selectedFrame) return;
      const current = selectedFrame.reference_ids ?? [];
      const next = current.includes(refId)
        ? current.filter((id) => id !== refId)
        : [...current, refId];

      markSaving();
      setFrames((prev) =>
        prev.map((f) =>
          f.id === selectedFrame.id ? { ...f, reference_ids: next } : f
        )
      );
      startTransition(async () => {
        const result = await updateFrame({
          frameId: selectedFrame.id,
          reference_ids: next,
        });
        if (!result.ok) {
          toast.error(result.error);
          setFrames((prev) =>
            prev.map((f) =>
              f.id === selectedFrame.id
                ? { ...f, reference_ids: current }
                : f
            )
          );
        } else {
          markSaved();
        }
      });
    },
    [selectedFrame, markSaving, markSaved]
  );

  // ── Delete frame ──────────────────────────────────────────────────────────
  const handleDeleteFrame = useCallback(
    (frameId: string) => {
      const oldFrames = frames;
      const newFrames = frames.filter((f) => f.id !== frameId);
      setFrames(newFrames);
      if (selectedId === frameId) {
        setSelectedId(newFrames[0]?.id ?? null);
        syncDraftsForFrame(newFrames[0] ?? null);
      }
      startTransition(async () => {
        const result = await deleteFrame(frameId);
        if (!result.ok) {
          toast.error(result.error);
          setFrames(oldFrames);
        }
      });
    },
    [frames, selectedId, syncDraftsForFrame]
  );

  // ── DnD reorder ───────────────────────────────────────────────────────────
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      setFrames((prev) => {
        const oldIndex = prev.findIndex((f) => f.id === active.id);
        const newIndex = prev.findIndex((f) => f.id === over.id);
        const reordered = arrayMove(prev, oldIndex, newIndex).map((f, i) => ({
          ...f,
          frame_order: i + 1,
        }));

        // Fire reorder action
        startTransition(async () => {
          const result = await reorderFrames({
            boardId: board.id,
            orderedFrameIds: reordered.map((f) => f.id),
          });
          if (!result.ok) {
            toast.error(result.error);
          }
        });

        return reordered;
      });
    },
    [board.id]
  );

  // ── Add frame: image ──────────────────────────────────────────────────────
  const imageInputRef = useRef<HTMLInputElement>(null);
  const revImageInputRef = useRef<HTMLInputElement>(null);
  const revVideoInputRef = useRef<HTMLInputElement>(null);

  const handleImageFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = "";

      const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
      if (file.size > MAX_IMAGE_BYTES) {
        toast.error(tFrames("file_too_large", { maxMb: "20" }));
        return;
      }

      const ext = extensionFor(file, "jpg");
      const frameId = crypto.randomUUID();
      const path = `${board.id}/${frameId}.${ext}`;

      const supabase = createSupabaseBrowser();
      toast.loading(tFrames("upload_in_progress"), { id: "upload" });

      const { error: uploadError } = await supabase.storage
        .from("preprod-frames")
        .upload(path, file, { contentType: file.type });

      if (uploadError) {
        toast.dismiss("upload");
        toast.error(tFrames("upload_failed"));
        return;
      }

      const result = await addFrame({
        boardId: board.id,
        media_type: "image",
        media_storage_path: path,
        thumbnail_path: null,
      });

      toast.dismiss("upload");

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      // Get a signed URL for the new frame
      const { data: signed } = await supabase.storage
        .from("preprod-frames")
        .createSignedUrl(path, 3600);

      const newFrame: FrameRow = {
        id: result.id,
        frame_order: (frames[frames.length - 1]?.frame_order ?? 0) + 1,
        media_type: "image",
        media_storage_path: path,
        media_external_url: null,
        media_embed_provider: null,
        thumbnail_path: null,
        caption: null,
        director_note: null,
        reference_ids: [],
        revision: 1,
        revision_group: crypto.randomUUID(),
        is_current_revision: true,
      };

      setFrames((prev) => [...prev, newFrame]);
      if (signed?.signedUrl) {
        setMediaUrls((prev) => ({ ...prev, [result.id]: signed.signedUrl }));
      }
      setSelectedId(result.id);
      syncDraftsForFrame(newFrame);
      setAddPopoverOpen(false);
    },
    [board.id, frames, tFrames, syncDraftsForFrame]
  );

  // ── Add frame: video upload ────────────────────────────────────────────────
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handleVideoFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = "";

      const check = validateVideoFile(file);
      if (!check.ok) {
        toast.error(
          check.reason === "size"
            ? tFrames("file_too_large", { maxMb: "500" })
            : tFrames("unsupported_format")
        );
        return;
      }

      toast.loading(tFrames("upload_in_progress"), { id: "upload" });

      const meta = await readVideoMetadata(file);
      const ext = extensionFor(file, "mp4");
      const frameId = crypto.randomUUID();
      const videoPath = `${board.id}/${frameId}.${ext}`;
      const supabase = createSupabaseBrowser();

      const { error: uploadError } = await supabase.storage
        .from("preprod-frames")
        .upload(videoPath, file, { contentType: file.type });

      if (uploadError) {
        toast.dismiss("upload");
        toast.error(tFrames("upload_failed"));
        return;
      }

      let thumbnailPath: string | null = null;
      if (meta.poster) {
        const posterPath = `${board.id}/${frameId}.poster.jpg`;
        const { error: posterError } = await supabase.storage
          .from("preprod-frames")
          .upload(posterPath, meta.poster, { contentType: "image/jpeg" });
        if (!posterError) {
          thumbnailPath = posterPath;
        }
      }

      const result = await addFrame({
        boardId: board.id,
        media_type: "video_upload",
        media_storage_path: videoPath,
        thumbnail_path: thumbnailPath,
      });

      toast.dismiss("upload");

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      // Signed URLs
      const pathsToSign = [videoPath];
      if (thumbnailPath) pathsToSign.push(thumbnailPath);
      const { data: signedList } = await supabase.storage
        .from("preprod-frames")
        .createSignedUrls(pathsToSign, 3600);

      const newUrls: Record<string, string> = {};
      if (signedList) {
        for (const s of signedList) {
          if (!s.signedUrl) continue;
          if (s.path === videoPath) newUrls[result.id] = s.signedUrl;
          if (s.path === thumbnailPath)
            newUrls[`${result.id}__thumb`] = s.signedUrl;
        }
      }

      const newFrame: FrameRow = {
        id: result.id,
        frame_order: (frames[frames.length - 1]?.frame_order ?? 0) + 1,
        media_type: "video_upload",
        media_storage_path: videoPath,
        media_external_url: null,
        media_embed_provider: null,
        thumbnail_path: thumbnailPath,
        caption: null,
        director_note: null,
        reference_ids: [],
        revision: 1,
        revision_group: crypto.randomUUID(),
        is_current_revision: true,
      };

      setFrames((prev) => [...prev, newFrame]);
      setMediaUrls((prev) => ({ ...prev, ...newUrls }));
      setSelectedId(result.id);
      syncDraftsForFrame(newFrame);
      setAddPopoverOpen(false);
    },
    [board.id, frames, tFrames, syncDraftsForFrame]
  );

  // ── Add frame: video embed URL ────────────────────────────────────────────
  const handleUrlSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const url = urlValue.trim();
      if (!url) return;

      toast.loading(tFrames("upload_in_progress"), { id: "upload" });

      const result = await addFrameFromUrl({ boardId: board.id, url });

      toast.dismiss("upload");

      if (!result.ok) {
        toast.error(
          result.error === "unfurl_failed"
            ? tFrames("url_invalid")
            : result.error
        );
        return;
      }

      // Optimistically add embed frame; no signed URL needed
      const newFrame: FrameRow = {
        id: result.id,
        frame_order: (frames[frames.length - 1]?.frame_order ?? 0) + 1,
        media_type: "video_embed",
        media_storage_path: null,
        media_external_url: url,
        media_embed_provider: null, // provider determined server-side; for local state unknown
        thumbnail_path: null,
        caption: null,
        director_note: null,
        reference_ids: [],
        revision: 1,
        revision_group: crypto.randomUUID(),
        is_current_revision: true,
      };

      setFrames((prev) => [...prev, newFrame]);
      setSelectedId(result.id);
      syncDraftsForFrame(newFrame);
      setUrlValue("");
      setUrlInputOpen(false);
      setAddPopoverOpen(false);
    },
    [board.id, frames, urlValue, tFrames, syncDraftsForFrame]
  );

  // ── Upload new revision: image ────────────────────────────────────────────
  const handleRevisionImageChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !selectedFrame) return;
      e.target.value = "";

      const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
      if (file.size > MAX_IMAGE_BYTES) {
        toast.error(tFrames("file_too_large", { maxMb: "20" }));
        return;
      }

      const ext = extensionFor(file, "jpg");
      const newId = crypto.randomUUID();
      const path = `${board.id}/${newId}.${ext}`;

      const supabase = createSupabaseBrowser();
      toast.loading(tFrames("upload_in_progress"), { id: "rev-upload" });

      const { error: uploadError } = await supabase.storage
        .from("preprod-frames")
        .upload(path, file, { contentType: file.type });

      if (uploadError) {
        toast.dismiss("rev-upload");
        toast.error(tFrames("upload_failed"));
        return;
      }

      const result = await createFrameRevision({
        frameId: selectedFrame.id,
        media_type: "image",
        media_storage_path: path,
        thumbnail_path: null,
      });

      toast.dismiss("rev-upload");

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      const { data: signed } = await supabase.storage
        .from("preprod-frames")
        .createSignedUrl(path, 3600);

      const newFrame: FrameRow = {
        id: result.id,
        frame_order: selectedFrame.frame_order,
        media_type: "image",
        media_storage_path: path,
        media_external_url: null,
        media_embed_provider: null,
        thumbnail_path: null,
        caption: selectedFrame.caption,
        director_note: selectedFrame.director_note,
        reference_ids: selectedFrame.reference_ids,
        revision: result.revision,
        revision_group: selectedFrame.revision_group,
        is_current_revision: true,
      };

      // Replace the old frame with the new revision in the list
      setFrames((prev) =>
        prev.map((f) => (f.id === selectedFrame.id ? newFrame : f))
      );
      if (signed?.signedUrl) {
        setMediaUrls((prev) => ({ ...prev, [result.id]: signed.signedUrl }));
      }
      // Add to revision history
      const histEntry: HistoryFrameRow = {
        id: result.id,
        revision_group: selectedFrame.revision_group,
        revision: result.revision,
        is_current_revision: true,
        media_type: "image",
        media_storage_path: path,
        media_external_url: null,
        media_embed_provider: null,
        thumbnail_path: null,
        caption: selectedFrame.caption,
        created_at: new Date().toISOString(),
      };
      setRevisionHistory((prev) => {
        const group = prev[selectedFrame.revision_group] ?? [];
        // Mark previous current as non-current in history
        const updated = group.map((r) =>
          r.is_current_revision ? { ...r, is_current_revision: false } : r
        );
        return { ...prev, [selectedFrame.revision_group]: [...updated, histEntry] };
      });
      setSelectedId(result.id);
      syncDraftsForFrame(newFrame);
      setRevPopoverOpen(false);
    },
    [board.id, selectedFrame, tFrames, syncDraftsForFrame]
  );

  // ── Upload new revision: video ────────────────────────────────────────────
  const handleRevisionVideoChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !selectedFrame) return;
      e.target.value = "";

      const check = validateVideoFile(file);
      if (!check.ok) {
        toast.error(
          check.reason === "size"
            ? tFrames("file_too_large", { maxMb: "500" })
            : tFrames("unsupported_format")
        );
        return;
      }

      toast.loading(tFrames("upload_in_progress"), { id: "rev-upload" });

      const meta = await readVideoMetadata(file);
      const ext = extensionFor(file, "mp4");
      const newId = crypto.randomUUID();
      const videoPath = `${board.id}/${newId}.${ext}`;
      const supabase = createSupabaseBrowser();

      const { error: uploadError } = await supabase.storage
        .from("preprod-frames")
        .upload(videoPath, file, { contentType: file.type });

      if (uploadError) {
        toast.dismiss("rev-upload");
        toast.error(tFrames("upload_failed"));
        return;
      }

      let thumbnailPath: string | null = null;
      if (meta.poster) {
        const posterPath = `${board.id}/${newId}.poster.jpg`;
        const { error: posterError } = await supabase.storage
          .from("preprod-frames")
          .upload(posterPath, meta.poster, { contentType: "image/jpeg" });
        if (!posterError) thumbnailPath = posterPath;
      }

      const result = await createFrameRevision({
        frameId: selectedFrame.id,
        media_type: "video_upload",
        media_storage_path: videoPath,
        thumbnail_path: thumbnailPath,
      });

      toast.dismiss("rev-upload");

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      const pathsToSign = [videoPath];
      if (thumbnailPath) pathsToSign.push(thumbnailPath);
      const { data: signedList } = await supabase.storage
        .from("preprod-frames")
        .createSignedUrls(pathsToSign, 3600);

      const newUrls: Record<string, string> = {};
      if (signedList) {
        for (const s of signedList) {
          if (!s.signedUrl) continue;
          if (s.path === videoPath) newUrls[result.id] = s.signedUrl;
          if (s.path === thumbnailPath) newUrls[`${result.id}__thumb`] = s.signedUrl;
        }
      }

      const newFrame: FrameRow = {
        id: result.id,
        frame_order: selectedFrame.frame_order,
        media_type: "video_upload",
        media_storage_path: videoPath,
        media_external_url: null,
        media_embed_provider: null,
        thumbnail_path: thumbnailPath,
        caption: selectedFrame.caption,
        director_note: selectedFrame.director_note,
        reference_ids: selectedFrame.reference_ids,
        revision: result.revision,
        revision_group: selectedFrame.revision_group,
        is_current_revision: true,
      };

      setFrames((prev) =>
        prev.map((f) => (f.id === selectedFrame.id ? newFrame : f))
      );
      setMediaUrls((prev) => ({ ...prev, ...newUrls }));
      const histEntry: HistoryFrameRow = {
        id: result.id,
        revision_group: selectedFrame.revision_group,
        revision: result.revision,
        is_current_revision: true,
        media_type: "video_upload",
        media_storage_path: videoPath,
        media_external_url: null,
        media_embed_provider: null,
        thumbnail_path: thumbnailPath,
        caption: selectedFrame.caption,
        created_at: new Date().toISOString(),
      };
      setRevisionHistory((prev) => {
        const group = prev[selectedFrame.revision_group] ?? [];
        const updated = group.map((r) =>
          r.is_current_revision ? { ...r, is_current_revision: false } : r
        );
        return { ...prev, [selectedFrame.revision_group]: [...updated, histEntry] };
      });
      setSelectedId(result.id);
      syncDraftsForFrame(newFrame);
      setRevPopoverOpen(false);
    },
    [board.id, selectedFrame, tFrames, syncDraftsForFrame]
  );

  // ── Upload new revision: embed URL ────────────────────────────────────────
  const handleRevisionUrlSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const url = revUrlValue.trim();
      if (!url || !selectedFrame) return;

      toast.loading(tFrames("upload_in_progress"), { id: "rev-upload" });

      const result = await createFrameRevision({
        frameId: selectedFrame.id,
        media_type: "video_embed",
        url,
      });

      toast.dismiss("rev-upload");

      if (!result.ok) {
        toast.error(
          result.error === "unfurl_failed" ? tFrames("url_invalid") : result.error
        );
        return;
      }

      const newFrame: FrameRow = {
        id: result.id,
        frame_order: selectedFrame.frame_order,
        media_type: "video_embed",
        media_storage_path: null,
        media_external_url: url,
        media_embed_provider: null,
        thumbnail_path: null,
        caption: selectedFrame.caption,
        director_note: selectedFrame.director_note,
        reference_ids: selectedFrame.reference_ids,
        revision: result.revision,
        revision_group: selectedFrame.revision_group,
        is_current_revision: true,
      };

      setFrames((prev) =>
        prev.map((f) => (f.id === selectedFrame.id ? newFrame : f))
      );
      const histEntry: HistoryFrameRow = {
        id: result.id,
        revision_group: selectedFrame.revision_group,
        revision: result.revision,
        is_current_revision: true,
        media_type: "video_embed",
        media_storage_path: null,
        media_external_url: url,
        media_embed_provider: null,
        thumbnail_path: null,
        caption: selectedFrame.caption,
        created_at: new Date().toISOString(),
      };
      setRevisionHistory((prev) => {
        const group = prev[selectedFrame.revision_group] ?? [];
        const updated = group.map((r) =>
          r.is_current_revision ? { ...r, is_current_revision: false } : r
        );
        return { ...prev, [selectedFrame.revision_group]: [...updated, histEntry] };
      });
      setSelectedId(result.id);
      syncDraftsForFrame(newFrame);
      setRevUrlValue("");
      setRevUrlInputOpen(false);
      setRevPopoverOpen(false);
    },
    [selectedFrame, revUrlValue, tFrames, syncDraftsForFrame]
  );

  // ── Restore historical revision ───────────────────────────────────────────
  const handleRestore = useCallback(
    async (historicalId: string) => {
      if (!selectedFrame) return;
      setIsRestoring(true);

      const result = await restoreFrameRevision({ frameId: historicalId });

      setIsRestoring(false);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      // The restored frame is now the new current revision
      const historicalEntry = (
        revisionHistory[selectedFrame.revision_group] ?? []
      ).find((r) => r.id === historicalId);

      const newFrame: FrameRow = {
        id: result.id,
        frame_order: selectedFrame.frame_order,
        media_type: historicalEntry?.media_type ?? selectedFrame.media_type,
        media_storage_path: historicalEntry?.media_storage_path ?? null,
        media_external_url: historicalEntry?.media_external_url ?? null,
        media_embed_provider: historicalEntry?.media_embed_provider ?? null,
        thumbnail_path: historicalEntry?.thumbnail_path ?? null,
        caption: historicalEntry?.caption ?? null,
        director_note: selectedFrame.director_note,
        reference_ids: selectedFrame.reference_ids,
        revision: result.revision,
        revision_group: selectedFrame.revision_group,
        is_current_revision: true,
      };

      setFrames((prev) =>
        prev.map((f) => (f.id === selectedFrame.id ? newFrame : f))
      );

      if (historicalEntry?.media_storage_path) {
        const supabase = createSupabaseBrowser();
        const { data: signed } = await supabase.storage
          .from("preprod-frames")
          .createSignedUrl(historicalEntry.media_storage_path, 3600);
        if (signed?.signedUrl) {
          setMediaUrls((prev) => ({ ...prev, [result.id]: signed.signedUrl }));
        }
        if (historicalEntry.thumbnail_path) {
          const { data: thumbSigned } = await supabase.storage
            .from("preprod-frames")
            .createSignedUrl(historicalEntry.thumbnail_path, 3600);
          if (thumbSigned?.signedUrl) {
            setMediaUrls((prev) => ({
              ...prev,
              [`${result.id}__thumb`]: thumbSigned.signedUrl,
            }));
          }
        }
      }

      const histEntry: HistoryFrameRow = {
        id: result.id,
        revision_group: selectedFrame.revision_group,
        revision: result.revision,
        is_current_revision: true,
        media_type: historicalEntry?.media_type ?? selectedFrame.media_type,
        media_storage_path: historicalEntry?.media_storage_path ?? null,
        media_external_url: historicalEntry?.media_external_url ?? null,
        media_embed_provider: historicalEntry?.media_embed_provider ?? null,
        thumbnail_path: historicalEntry?.thumbnail_path ?? null,
        caption: historicalEntry?.caption ?? null,
        created_at: new Date().toISOString(),
      };
      setRevisionHistory((prev) => {
        const group = prev[selectedFrame.revision_group] ?? [];
        const updated = group.map((r) =>
          r.is_current_revision ? { ...r, is_current_revision: false } : r
        );
        return { ...prev, [selectedFrame.revision_group]: [...updated, histEntry] };
      });
      setSelectedId(result.id);
      syncDraftsForFrame(newFrame);
      setCompareTarget(null);
      toast.success(tRevisions("restore_confirm"));
    },
    [selectedFrame, revisionHistory, tRevisions, syncDraftsForFrame]
  );

  // ── Main canvas renderer ───────────────────────────────────────────────────

  function renderMainCanvas() {
    if (!selectedFrame) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm keep-all">
          <ImageIcon className="w-10 h-10 mb-3 opacity-30" />
          <p>{tFrames("frame_n", { n: "—" })}</p>
        </div>
      );
    }

    const { media_type, media_external_url, media_embed_provider } =
      selectedFrame;

    if (media_type === "image") {
      const url = mediaUrls[selectedFrame.id];
      if (!url) {
        return (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        );
      }
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={selectedFrame.caption ?? ""}
          className="max-w-full max-h-full object-contain"
        />
      );
    }

    if (media_type === "video_upload") {
      const url = mediaUrls[selectedFrame.id];
      if (!url) {
        return (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        );
      }
      return (
        <video
          key={url}
          src={url}
          controls
          className="max-w-full max-h-full rounded"
          playsInline
        />
      );
    }

    if (media_type === "video_embed") {
      const provider = media_embed_provider;
      const extUrl = media_external_url;

      if (provider === "youtube" && extUrl) {
        // Build embed src
        let videoId: string | null = null;
        try {
          const u = new URL(extUrl);
          const host = u.hostname.replace(/^www\./, "");
          if (host === "youtu.be") {
            videoId = u.pathname.slice(1).split("/")[0] || null;
          } else if (u.pathname.startsWith("/watch")) {
            videoId = u.searchParams.get("v");
          } else {
            const m = u.pathname.match(/\/(?:shorts|embed)\/([^/]+)/);
            if (m) videoId = m[1];
          }
        } catch {
          // ignore
        }
        if (videoId) {
          return (
            <iframe
              src={`https://www.youtube.com/embed/${videoId}`}
              className="w-full aspect-video rounded"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={selectedFrame.caption ?? "YouTube video"}
            />
          );
        }
      }

      if (provider === "vimeo" && extUrl) {
        let videoId: string | null = null;
        try {
          const u = new URL(extUrl);
          const m = u.pathname.match(/\/(\d+)/);
          if (m) videoId = m[1];
        } catch {
          // ignore
        }
        if (videoId) {
          return (
            <iframe
              src={`https://player.vimeo.com/video/${videoId}`}
              className="w-full aspect-video rounded"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              title={selectedFrame.caption ?? "Vimeo video"}
            />
          );
        }
      }

      // TikTok / Instagram / unknown — show thumbnail + link
      const thumbUrl = embedThumbnail(provider, extUrl);
      const providerLabel = provider
        ? provider.charAt(0).toUpperCase() + provider.slice(1)
        : "External";

      return (
        <div className="flex flex-col items-center justify-center gap-4">
          {thumbUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbUrl}
              alt=""
              className="max-w-sm rounded shadow"
            />
          ) : (
            <div className="w-32 h-24 rounded bg-muted flex items-center justify-center">
              <Video className="w-8 h-8 text-muted-foreground" />
            </div>
          )}
          {extUrl && (
            <a
              href={extUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm font-medium hover:underline"
            >
              <ExternalLink className="w-4 h-4" />
              Open on {providerLabel}
            </a>
          )}
        </div>
      );
    }

    return null;
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const selectedFrameIndex = frames.findIndex((f) => f.id === selectedId);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border shrink-0">
        {/* Back */}
        <NavLink
          href={backHref as "/app/preprod"}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label={tPreprod("editor_back_to_list")}
        >
          <ChevronLeft className="w-5 h-5" />
        </NavLink>

        {/* Editable title */}
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          className="flex-1 min-w-0 bg-transparent text-base font-semibold tracking-tight outline-none border-b border-transparent focus:border-border transition-colors py-0.5 keep-all"
          aria-label={tPreprod("title_label")}
          maxLength={200}
        />

        {/* Status pill */}
        <Badge
          variant={statusBadgeVariant(board.status)}
          className="rounded-full text-[11px] px-2.5 py-0.5 shrink-0"
        >
          {tPreprod(
            `status_${board.status}` as
              | "status_draft"
              | "status_shared"
              | "status_approved"
              | "status_archived"
          )}
        </Badge>

        {/* Share button (disabled — Wave D) */}
        <div title="Wave D">
          <Button
            variant="outline"
            size="sm"
            disabled
            className="rounded-full text-xs px-3 h-7"
          >
            {tPreprod("share_link_label")}
          </Button>
        </div>

        {/* Actions menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem disabled>{tPreprod("duplicate")}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>{tPreprod("archive")}</DropdownMenuItem>
            <DropdownMenuItem disabled>
              {tPreprod("status_approved")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── Three-column body ─────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left rail: frame list */}
        <aside className="w-[240px] shrink-0 flex flex-col border-r border-border overflow-y-auto">
          <div className="flex-1 p-2">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={frames.map((f) => f.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="flex flex-col gap-1">
                  {frames.map((frame, idx) => (
                    <SortableFrameItem
                      key={frame.id}
                      frame={frame}
                      index={idx}
                      selected={frame.id === selectedId}
                      mediaUrl={mediaUrls[frame.id]}
                      thumbUrl={mediaUrls[`${frame.id}__thumb`]}
                      counts={
                        frameCounts.get(frame.id) ?? {
                          like: 0,
                          dislike: 0,
                          hand: 0,
                          total: 0,
                          comments: 0,
                          unresolvedComments: 0,
                        }
                      }
                      onClick={() => handleSelectFrame(frame.id)}
                      onDelete={handleDeleteFrame}
                      onOpenFeedback={() => setFeedbackFrameId(frame.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>

          {/* Add frame button */}
          <div className="p-2 border-t border-border shrink-0">
            <Popover open={addPopoverOpen} onOpenChange={setAddPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full rounded-full text-xs gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {tFrames("add_frame")}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-52 p-1"
                align="start"
                side="top"
              >
                {/* Hidden file inputs */}
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleImageFileChange}
                />
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/mp4,video/quicktime,video/webm"
                  className="hidden"
                  onChange={handleVideoFileChange}
                />

                {/* Upload image */}
                <button
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent transition-colors"
                  onClick={() => imageInputRef.current?.click()}
                >
                  <ImageIcon className="w-4 h-4 text-muted-foreground" />
                  {tFrames("media_upload_image")}
                </button>

                {/* Upload video */}
                <button
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent transition-colors"
                  onClick={() => videoInputRef.current?.click()}
                >
                  <Video className="w-4 h-4 text-muted-foreground" />
                  {tFrames("media_upload_video")}
                </button>

                {/* Paste URL */}
                <button
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent transition-colors"
                  onClick={() => setUrlInputOpen((v) => !v)}
                >
                  <Link className="w-4 h-4 text-muted-foreground" />
                  {tFrames("media_paste_url")}
                </button>

                {urlInputOpen && (
                  <form
                    onSubmit={handleUrlSubmit}
                    className="mt-1 px-1 pb-1 flex flex-col gap-1.5"
                  >
                    <Input
                      type="url"
                      placeholder="https://..."
                      value={urlValue}
                      onChange={(e) => setUrlValue(e.target.value)}
                      className="h-7 text-xs"
                      autoFocus
                    />
                    <Button
                      type="submit"
                      size="sm"
                      disabled={!urlValue.trim() || isPending}
                      className="h-7 text-xs rounded-full"
                    >
                      {isPending ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        tFrames("media_paste_url")
                      )}
                    </Button>
                  </form>
                )}
              </PopoverContent>
            </Popover>
          </div>
        </aside>

        {/* Main canvas */}
        <main className="flex-1 flex items-center justify-center overflow-hidden bg-muted/20 p-6">
          {renderMainCanvas()}
        </main>

        {/* Right rail: frame metadata */}
        <aside className="w-[320px] shrink-0 flex flex-col border-l border-border overflow-y-auto">
          {/* Save indicator */}
          <div className="flex items-center justify-end gap-1.5 px-4 pt-3 pb-1 shrink-0">
            {saveState === "saving" && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-xs text-muted-foreground keep-all">
                  저장 중...
                </span>
              </>
            )}
            {saveState === "saved" && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <span className="text-xs text-muted-foreground keep-all">
                  {tPreprod("saved_indicator")}
                </span>
              </>
            )}
          </div>

          {/* Feedback overview card */}
          <div className="mx-4 mb-3 rounded-lg border border-border p-3 flex flex-col gap-2 shrink-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground keep-all">
              {tPreprod("feedback_overview")}
            </p>
            <div className="flex items-center justify-between text-xs keep-all">
              <span className="text-muted-foreground">
                {tPreprod("feedback_total_reactions")}
              </span>
              <span className="font-semibold tabular-nums">
                {boardFeedback.totalReactions}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs keep-all">
              <span className="text-muted-foreground">
                {tPreprod("feedback_unresolved_comments")}
              </span>
              <span className="font-semibold tabular-nums flex items-center gap-1">
                {boardFeedback.unresolvedComments > 0 && (
                  <CircleDot className="w-3 h-3 text-amber-500" />
                )}
                {boardFeedback.unresolvedComments}
              </span>
            </div>
            {(boardFeedback.positiveFrames > 0 ||
              boardFeedback.negativeFrames > 0) && (
              <div className="flex flex-col gap-1 pt-1 border-t border-border">
                {boardFeedback.positiveFrames > 0 && (
                  <div className="flex items-center gap-1.5 text-[11px] keep-all">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    <span className="text-muted-foreground">
                      {tPreprod("feedback_sentiment_positive")}
                    </span>
                    <span className="ml-auto tabular-nums font-medium">
                      {tPreprod("feedback_flagged_frames", {
                        n: boardFeedback.positiveFrames,
                      })}
                    </span>
                  </div>
                )}
                {boardFeedback.negativeFrames > 0 && (
                  <div className="flex items-center gap-1.5 text-[11px] keep-all">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    <span className="text-muted-foreground">
                      {tPreprod("feedback_sentiment_negative")}
                    </span>
                    <span className="ml-auto tabular-nums font-medium">
                      {tPreprod("feedback_flagged_frames", {
                        n: boardFeedback.negativeFrames,
                      })}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {selectedFrame ? (
            <div className="flex flex-col gap-5 px-4 py-3">
              {/* Frame label */}
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide keep-all">
                {tFrames("frame_n", {
                  n: selectedFrameIndex >= 0 ? selectedFrameIndex + 1 : "—",
                })}
                {selectedFrame.revision > 1 && (
                  <span className="ml-1.5 text-muted-foreground/60 tabular-nums">
                    v{selectedFrame.revision}
                  </span>
                )}
              </p>

              {/* Caption */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium keep-all">
                  {tFrames("caption_label")}
                </label>
                <Textarea
                  value={captionDraft}
                  onChange={(e) => setCaptionDraft(e.target.value)}
                  onBlur={handleCaptionBlur}
                  onFocus={() => {
                    // Sync draft when focusing in case frame changed without explicit select
                    if (selectedFrame.caption !== null) {
                      setCaptionDraft(selectedFrame.caption);
                    }
                  }}
                  placeholder={tFrames("caption_ph")}
                  rows={3}
                  maxLength={500}
                  className="text-sm resize-none"
                />
              </div>

              {/* Director note */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium keep-all">
                  {tFrames("director_note_label")}
                </label>
                <Textarea
                  value={directorNoteDraft}
                  onChange={(e) => setDirectorNoteDraft(e.target.value)}
                  onBlur={handleDirectorNoteBlur}
                  onFocus={() => {
                    if (selectedFrame.director_note !== null) {
                      setDirectorNoteDraft(selectedFrame.director_note);
                    }
                  }}
                  placeholder={tFrames("director_note_ph")}
                  rows={4}
                  maxLength={2000}
                  className="text-sm resize-none"
                />
              </div>

              {/* Linked references */}
              <div className="space-y-1.5">
                <p className="text-xs font-medium keep-all">
                  {tFrames("linked_references_label")}
                </p>
                {refs.length === 0 ? (
                  <p className="text-xs text-muted-foreground keep-all">
                    {tFrames("reference_none")}
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {refs.map((ref) => {
                      const linked = selectedFrame.reference_ids?.includes(
                        ref.id
                      );
                      const label =
                        ref.caption ?? ref.og_title ?? ref.media_type;
                      return (
                        <button
                          key={ref.id}
                          onClick={() => handleToggleRef(ref.id)}
                          className={cn(
                            "rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors keep-all",
                            linked
                              ? "bg-foreground text-background border-foreground"
                              : "bg-background text-foreground border-border hover:bg-accent"
                          )}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Revision history */}
              <div className="space-y-1.5">
                <p className="text-xs font-medium keep-all flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5" />
                  {tRevisions("revision_history")}
                </p>
                <div className="rounded-md border border-border divide-y divide-border">
                  {(revisionHistory[selectedFrame.revision_group] ?? []).map(
                    (rev) => {
                      const isCurrent = rev.is_current_revision;
                      return (
                        <div
                          key={rev.id}
                          className="flex items-center gap-2 px-3 py-1.5"
                        >
                          <Badge
                            variant={isCurrent ? "default" : "secondary"}
                            className="rounded-full text-[10px] px-1.5 py-0 shrink-0"
                          >
                            v{rev.revision}
                          </Badge>
                          <span className="text-xs text-muted-foreground flex-1 truncate keep-all">
                            {isCurrent
                              ? tRevisions("revision_current")
                              : relativeTime(rev.created_at)}
                          </span>
                          {!isCurrent && (
                            <button
                              className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors keep-all"
                              onClick={() => setCompareTarget(rev)}
                            >
                              {tRevisions("compare_side_by_side")}
                            </button>
                          )}
                        </div>
                      );
                    }
                  )}
                  {(revisionHistory[selectedFrame.revision_group] ?? []).length === 0 && (
                    <div className="px-3 py-2 text-xs text-muted-foreground keep-all">
                      {tRevisions("revision_current")} — v{selectedFrame.revision}
                    </div>
                  )}
                </div>

                {/* Hidden inputs for revision uploads */}
                <input
                  ref={revImageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleRevisionImageChange}
                />
                <input
                  ref={revVideoInputRef}
                  type="file"
                  accept="video/mp4,video/quicktime,video/webm"
                  className="hidden"
                  onChange={handleRevisionVideoChange}
                />

                <Popover open={revPopoverOpen} onOpenChange={setRevPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full rounded-full text-xs h-7 mt-1"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      {tRevisions("new_revision")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-52 p-1" align="start" side="top">
                    <button
                      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent transition-colors"
                      onClick={() => revImageInputRef.current?.click()}
                    >
                      <ImageIcon className="w-4 h-4 text-muted-foreground" />
                      {tFrames("media_upload_image")}
                    </button>
                    <button
                      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent transition-colors"
                      onClick={() => revVideoInputRef.current?.click()}
                    >
                      <Video className="w-4 h-4 text-muted-foreground" />
                      {tFrames("media_upload_video")}
                    </button>
                    <button
                      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent transition-colors"
                      onClick={() => setRevUrlInputOpen((v) => !v)}
                    >
                      <Link className="w-4 h-4 text-muted-foreground" />
                      {tFrames("media_paste_url")}
                    </button>
                    {revUrlInputOpen && (
                      <form
                        onSubmit={handleRevisionUrlSubmit}
                        className="mt-1 px-1 pb-1 flex flex-col gap-1.5"
                      >
                        <Input
                          type="url"
                          placeholder="https://..."
                          value={revUrlValue}
                          onChange={(e) => setRevUrlValue(e.target.value)}
                          className="h-7 text-xs"
                          autoFocus
                        />
                        <Button
                          type="submit"
                          size="sm"
                          disabled={!revUrlValue.trim() || isPending}
                          className="h-7 text-xs rounded-full"
                        >
                          {isPending ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            tFrames("media_paste_url")
                          )}
                        </Button>
                      </form>
                    )}
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground text-sm px-4 keep-all">
              <p>{tFrames("frame_n", { n: "—" })}</p>
            </div>
          )}
        </aside>
      </div>

      {/* Feedback dialog */}
      {feedbackFrame && (
        <FeedbackDialog
          open={feedbackFrameId !== null}
          onOpenChange={(open) => {
            if (!open) setFeedbackFrameId(null);
          }}
          frameLabel={tFrames("frame_n", {
            n: feedbackFrameIndex >= 0 ? feedbackFrameIndex + 1 : "—",
          })}
          reactions={reactionsByFrame.get(feedbackFrame.id) ?? []}
          comments={commentsByFrame.get(feedbackFrame.id) ?? []}
          onResolveToggle={handleResolveToggle}
          resolvingIds={resolvingIds}
        />
      )}

      {/* Compare dialog */}
      {compareTarget && selectedFrame && (() => {
        const currentHistEntry = (
          revisionHistory[selectedFrame.revision_group] ?? []
        ).find((r) => r.is_current_revision);
        if (!currentHistEntry) return null;
        return (
          <CompareDialog
            historical={compareTarget}
            current={currentHistEntry}
            mediaUrls={mediaUrls}
            open={compareTarget !== null}
            onOpenChange={(open) => { if (!open) setCompareTarget(null); }}
            onRestore={handleRestore}
            isRestoring={isRestoring}
          />
        );
      })()}
    </div>
  );
}
