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
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import {
  ChevronLeft,
  GripVertical,
  Image as ImageIcon,
  Video,
  Link as LinkIcon,
  Plus,
  X,
  Check,
  Loader2,
  Eye,
} from "lucide-react";
import slugify from "slugify";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Link as NavLink } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import {
  updateShowcase,
  addShowcaseMedia,
  removeShowcaseMedia,
  reorderShowcaseMedia,
  setShowcaseCover,
  requestShowcaseUploadUrls,
  publishShowcase,
  unpublishShowcase,
  requestBadgeRemoval,
  approveBadgeRemoval,
  denyBadgeRemoval,
  setShowcasePassword,
} from "@/app/[locale]/app/showcases/actions";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ShowcaseData = {
  id: string;
  title: string;
  subtitle: string | null;
  slug: string;
  status: string;
  client_name_public: string | null;
  narrative_md: string | null;
  credits_md: string | null;
  cover_media_type: string | null;
  cover_media_storage_path: string | null;
  cover_media_external_url: string | null;
  made_with_yagi: boolean;
  badge_removal_requested: boolean;
  badge_removal_approved_at: string | null;
  is_password_protected: boolean;
  published_at: string | null;
  view_count: number;
  project_id: string;
  project_title: string | null;
};

export type ShowcaseMediaItem = {
  id: string;
  sort_order: number;
  media_type: string;
  storage_path: string | null;
  external_url: string | null;
  embed_provider: string | null;
  caption: string | null;
};

type Props = {
  showcase: ShowcaseData;
  media: ShowcaseMediaItem[];
  mediaUrlMap: Record<string, string>;
  canPublish: boolean;
  canManageBadge: boolean;
  canManagePassword: boolean;
};

const SLUG_RE = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
const MAX_UPLOAD_BYTES = 500 * 1024 * 1024;
const ALLOWED_UPLOAD_MIMES =
  /^(image\/(jpeg|png|webp|gif)|video\/(mp4|quicktime|webm))$/;

function inferEmbedProvider(
  url: string,
): "youtube" | "vimeo" | "tiktok" | "instagram" | null {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.endsWith("youtube.com") || host.endsWith("youtu.be"))
      return "youtube";
    if (host.endsWith("vimeo.com")) return "vimeo";
    if (host.endsWith("tiktok.com")) return "tiktok";
    if (host.endsWith("instagram.com")) return "instagram";
  } catch {
    return null;
  }
  return null;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ShowcaseEditor({
  showcase: initialShowcase,
  media: initialMedia,
  mediaUrlMap: initialMediaUrlMap,
  canPublish,
  canManageBadge,
  canManagePassword,
}: Props) {
  const t = useTranslations("showcase");
  const tCommon = useTranslations("common");

  const [showcase, setShowcase] = useState<ShowcaseData>(initialShowcase);
  const [media, setMedia] = useState<ShowcaseMediaItem[]>(initialMedia);
  const [mediaUrlMap, setMediaUrlMap] = useState<Record<string, string>>(
    initialMediaUrlMap,
  );
  const [, startTransition] = useTransition();

  // Local draft fields (so blur-save can debounce).
  const [titleDraft, setTitleDraft] = useState(showcase.title);
  const [subtitleDraft, setSubtitleDraft] = useState(showcase.subtitle ?? "");
  const [slugDraft, setSlugDraft] = useState(showcase.slug);
  const [clientNameDraft, setClientNameDraft] = useState(
    showcase.client_name_public ?? "",
  );
  const [narrativeDraft, setNarrativeDraft] = useState(
    showcase.narrative_md ?? "",
  );
  const [creditsDraft, setCreditsDraft] = useState(showcase.credits_md ?? "");
  const [narrativePreview, setNarrativePreview] = useState(false);

  const [savingField, setSavingField] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  // ── save helper ───────────────────────────────────────────────────────────
  const commitField = useCallback(
    async (
      input: Parameters<typeof updateShowcase>[0],
      fieldKey: string,
    ) => {
      setSavingField(fieldKey);
      const result = await updateShowcase(input);
      setSavingField(null);
      if (!result.ok) {
        toast.error(t("editor_save_error"));
        return false;
      }
      return true;
    },
    [t],
  );

  const onBlurTitle = useCallback(async () => {
    const next = titleDraft.trim();
    if (!next) return;
    if (next === showcase.title) return;
    const ok = await commitField(
      { showcaseId: showcase.id, title: next },
      "title",
    );
    if (ok) setShowcase((s) => ({ ...s, title: next }));
  }, [commitField, showcase.id, showcase.title, titleDraft]);

  const onBlurSubtitle = useCallback(async () => {
    const next = subtitleDraft.trim();
    if ((showcase.subtitle ?? "") === next) return;
    const ok = await commitField(
      { showcaseId: showcase.id, subtitle: next || null },
      "subtitle",
    );
    if (ok) setShowcase((s) => ({ ...s, subtitle: next || null }));
  }, [commitField, showcase.id, showcase.subtitle, subtitleDraft]);

  const onBlurClientName = useCallback(async () => {
    const next = clientNameDraft.trim();
    if ((showcase.client_name_public ?? "") === next) return;
    const ok = await commitField(
      { showcaseId: showcase.id, client_name_public: next || null },
      "client_name",
    );
    if (ok) setShowcase((s) => ({ ...s, client_name_public: next || null }));
  }, [
    commitField,
    showcase.id,
    showcase.client_name_public,
    clientNameDraft,
  ]);

  const onBlurSlug = useCallback(async () => {
    const next = slugDraft.trim();
    if (!next || next === showcase.slug) return;
    if (!SLUG_RE.test(next)) {
      toast.error(t("editor_publish_check_slug"));
      setSlugDraft(showcase.slug);
      return;
    }
    const ok = await commitField(
      { showcaseId: showcase.id, slug: next },
      "slug",
    );
    if (ok) setShowcase((s) => ({ ...s, slug: next }));
    else setSlugDraft(showcase.slug);
  }, [commitField, showcase.id, showcase.slug, slugDraft, t]);

  const onBlurNarrative = useCallback(async () => {
    if (narrativeDraft === (showcase.narrative_md ?? "")) return;
    const ok = await commitField(
      { showcaseId: showcase.id, narrative_md: narrativeDraft || null },
      "narrative",
    );
    if (ok)
      setShowcase((s) => ({ ...s, narrative_md: narrativeDraft || null }));
  }, [commitField, showcase.id, showcase.narrative_md, narrativeDraft]);

  const onBlurCredits = useCallback(async () => {
    if (creditsDraft === (showcase.credits_md ?? "")) return;
    const ok = await commitField(
      { showcaseId: showcase.id, credits_md: creditsDraft || null },
      "credits",
    );
    if (ok) setShowcase((s) => ({ ...s, credits_md: creditsDraft || null }));
  }, [commitField, showcase.id, showcase.credits_md, creditsDraft]);

  // ── auto-generate slug from title ─────────────────────────────────────────
  const autoSlug = useCallback(() => {
    const base =
      slugify(titleDraft || showcase.title, {
        lower: true,
        strict: true,
        trim: true,
      }) || `showcase-${showcase.id.slice(0, 8)}`;
    setSlugDraft(base);
    startTransition(async () => {
      const ok = await commitField(
        { showcaseId: showcase.id, slug: base },
        "slug",
      );
      if (ok) setShowcase((s) => ({ ...s, slug: base }));
    });
  }, [commitField, showcase.id, showcase.title, titleDraft]);

  // ── media: upload ─────────────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;

      if (file.size > MAX_UPLOAD_BYTES) {
        toast.error(t("editor_save_error"));
        return;
      }
      if (!ALLOWED_UPLOAD_MIMES.test(file.type)) {
        toast.error(t("editor_save_error"));
        return;
      }

      const toastId = `upload-${file.name}`;
      toast.loading(file.name, { id: toastId });

      const urlRes = await requestShowcaseUploadUrls(showcase.id, [
        { name: file.name, size: file.size, type: file.type },
      ]);
      if (!urlRes.ok || urlRes.uploads.length === 0) {
        toast.dismiss(toastId);
        toast.error(t("editor_save_error"));
        return;
      }
      const upload = urlRes.uploads[0];

      // PUT the file to the signed URL.
      const putRes = await fetch(upload.signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!putRes.ok) {
        toast.dismiss(toastId);
        toast.error(t("editor_save_error"));
        return;
      }

      const mediaType: "image" | "video_upload" = file.type.startsWith(
        "image/",
      )
        ? "image"
        : "video_upload";

      const addRes = await addShowcaseMedia({
        showcaseId: showcase.id,
        mediaType,
        storagePath: upload.path,
      });
      toast.dismiss(toastId);
      if (!addRes.ok) {
        toast.error(addRes.error);
        return;
      }

      // Build client-side object URL for immediate preview.
      const objectUrl = URL.createObjectURL(file);
      setMediaUrlMap((prev) => ({ ...prev, [upload.path]: objectUrl }));
      setMedia((prev) => [
        ...prev,
        {
          id: addRes.mediaId,
          sort_order: (prev[prev.length - 1]?.sort_order ?? 0) + 1,
          media_type: mediaType,
          storage_path: upload.path,
          external_url: null,
          embed_provider: null,
          caption: null,
        },
      ]);
      toast.success(t("editor_save_success"));
    },
    [showcase.id, t],
  );

  // ── media: add embed ──────────────────────────────────────────────────────
  const [embedDialogOpen, setEmbedDialogOpen] = useState(false);
  const [embedUrlDraft, setEmbedUrlDraft] = useState("");
  const [embedSaving, setEmbedSaving] = useState(false);

  const handleAddEmbed = useCallback(async () => {
    const url = embedUrlDraft.trim();
    if (!url) return;
    const provider = inferEmbedProvider(url);
    if (!provider) {
      toast.error(t("editor_media_external_url_label"));
      return;
    }
    setEmbedSaving(true);
    const res = await addShowcaseMedia({
      showcaseId: showcase.id,
      mediaType: "video_embed",
      externalUrl: url,
      embedProvider: provider,
    });
    setEmbedSaving(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setMedia((prev) => [
      ...prev,
      {
        id: res.mediaId,
        sort_order: (prev[prev.length - 1]?.sort_order ?? 0) + 1,
        media_type: "video_embed",
        storage_path: null,
        external_url: url,
        embed_provider: provider,
        caption: null,
      },
    ]);
    setEmbedUrlDraft("");
    setEmbedDialogOpen(false);
    toast.success(t("editor_save_success"));
  }, [embedUrlDraft, showcase.id, t]);

  // ── media: remove ─────────────────────────────────────────────────────────
  const handleRemove = useCallback(
    async (mediaId: string) => {
      if (!window.confirm(t("editor_media_remove_confirm"))) return;
      const prev = media;
      setMedia((cur) => cur.filter((m) => m.id !== mediaId));
      const res = await removeShowcaseMedia(mediaId);
      if (!res.ok) {
        toast.error(res.error);
        setMedia(prev);
      }
    },
    [media, t],
  );

  // ── media: caption save on blur ───────────────────────────────────────────
  const handleCaptionBlur = useCallback(
    async (mediaId: string, caption: string) => {
      // We don't have a dedicated action for caption updates — skip persist.
      // v1: captions editable locally but reload-safe via updateShowcase? No.
      // Since the spec's updateShowcase doesn't cover media, we keep captions
      // client-only for now. Revisit when a media-update action ships.
      setMedia((cur) =>
        cur.map((m) => (m.id === mediaId ? { ...m, caption } : m)),
      );
    },
    [],
  );

  // ── media: reorder ────────────────────────────────────────────────────────
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      setMedia((prev) => {
        const oldIndex = prev.findIndex((m) => m.id === active.id);
        const newIndex = prev.findIndex((m) => m.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return prev;
        const next = arrayMove(prev, oldIndex, newIndex).map((m, i) => ({
          ...m,
          sort_order: i + 1,
        }));
        startTransition(async () => {
          const res = await reorderShowcaseMedia(
            showcase.id,
            next.map((m) => m.id),
          );
          if (!res.ok) {
            toast.error(res.error);
          }
        });
        return next;
      });
    },
    [showcase.id],
  );

  // ── cover ─────────────────────────────────────────────────────────────────
  const handleSetCover = useCallback(
    async (mediaId: string) => {
      const item = media.find((m) => m.id === mediaId);
      if (!item) return;
      const res = await setShowcaseCover(showcase.id, mediaId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setShowcase((s) => ({
        ...s,
        cover_media_type: item.media_type,
        cover_media_storage_path: item.storage_path,
        cover_media_external_url: item.external_url,
      }));
      toast.success(t("editor_save_success"));
    },
    [media, showcase.id, t],
  );

  // ── badge ─────────────────────────────────────────────────────────────────
  const [badgeDialogOpen, setBadgeDialogOpen] = useState(false);
  const [badgeReason, setBadgeReason] = useState("");
  const [badgeSubmitting, setBadgeSubmitting] = useState(false);

  const handleRequestBadge = useCallback(async () => {
    setBadgeSubmitting(true);
    const res = await requestBadgeRemoval(showcase.id, badgeReason);
    setBadgeSubmitting(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setShowcase((s) => ({ ...s, badge_removal_requested: true }));
    setBadgeDialogOpen(false);
    toast.success(t("editor_badge_request_success"));
  }, [badgeReason, showcase.id, t]);

  const handleApproveBadge = useCallback(async () => {
    const res = await approveBadgeRemoval(showcase.id);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setShowcase((s) => ({
      ...s,
      made_with_yagi: false,
      badge_removal_requested: false,
      badge_removal_approved_at: new Date().toISOString(),
    }));
    toast.success(t("editor_save_success"));
  }, [showcase.id, t]);

  const handleDenyBadge = useCallback(async () => {
    const res = await denyBadgeRemoval(showcase.id);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setShowcase((s) => ({ ...s, badge_removal_requested: false }));
    toast.success(t("editor_save_success"));
  }, [showcase.id, t]);

  // ── password ──────────────────────────────────────────────────────────────
  const [passwordDraft, setPasswordDraft] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);

  const handleSavePassword = useCallback(async () => {
    setPasswordBusy(true);
    const pw = passwordDraft.trim();
    const res = await setShowcasePassword(showcase.id, pw || null);
    setPasswordBusy(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setShowcase((s) => ({ ...s, is_password_protected: pw.length > 0 }));
    setPasswordDraft("");
    toast.success(
      pw.length > 0
        ? t("editor_password_save_success")
        : t("editor_password_remove_success"),
    );
  }, [passwordDraft, showcase.id, t]);

  const handleRemovePassword = useCallback(async () => {
    setPasswordBusy(true);
    const res = await setShowcasePassword(showcase.id, null);
    setPasswordBusy(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setShowcase((s) => ({ ...s, is_password_protected: false }));
    setPasswordDraft("");
    toast.success(t("editor_password_remove_success"));
  }, [showcase.id, t]);

  // ── publish checklist ─────────────────────────────────────────────────────
  const narrativeLen = narrativeDraft.length;
  const hasCover = useMemo(
    () =>
      Boolean(
        showcase.cover_media_type &&
          (showcase.cover_media_storage_path ||
            showcase.cover_media_external_url),
      ),
    [
      showcase.cover_media_type,
      showcase.cover_media_storage_path,
      showcase.cover_media_external_url,
    ],
  );
  const hasMinMedia = media.length >= 3;
  const hasNarrative = narrativeLen >= 200;
  const hasValidSlug = SLUG_RE.test(slugDraft || showcase.slug);
  const canPublishNow =
    canPublish && hasCover && hasMinMedia && hasNarrative && hasValidSlug;

  // ── publish / unpublish ───────────────────────────────────────────────────
  const [publishing, setPublishing] = useState(false);

  const handlePublish = useCallback(async () => {
    setPublishing(true);
    const res = await publishShowcase(showcase.id);
    setPublishing(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setShowcase((s) => ({
      ...s,
      status: "published",
      published_at: new Date().toISOString(),
      slug: res.slug,
    }));
    setSlugDraft(res.slug);
    toast.success(t("editor_publish_success"));
    void navigator.clipboard?.writeText(res.url).then(() => {
      toast.success(t("editor_publish_url_copied"));
    });
  }, [showcase.id, t]);

  const handleUnpublish = useCallback(async () => {
    setPublishing(true);
    const res = await unpublishShowcase(showcase.id);
    setPublishing(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setShowcase((s) => ({
      ...s,
      status: "draft",
      published_at: null,
    }));
    toast.success(t("editor_unpublish_success"));
  }, [showcase.id, t]);

  // ── effects ───────────────────────────────────────────────────────────────

  // Revoke local object URLs on unmount.
  useEffect(() => {
    return () => {
      for (const url of Object.values(mediaUrlMap)) {
        if (url.startsWith("blob:")) URL.revokeObjectURL(url);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── derived ───────────────────────────────────────────────────────────────
  const coverUrl = useMemo(() => {
    if (
      showcase.cover_media_storage_path &&
      mediaUrlMap[showcase.cover_media_storage_path]
    ) {
      return mediaUrlMap[showcase.cover_media_storage_path];
    }
    return showcase.cover_media_external_url ?? null;
  }, [
    mediaUrlMap,
    showcase.cover_media_storage_path,
    showcase.cover_media_external_url,
  ]);

  const isPublished = showcase.status === "published";

  return (
    <div className="min-h-screen pb-32">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background border-b border-border px-8 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <NavLink
            href="/app/showcases"
            className="text-muted-foreground hover:text-foreground shrink-0"
          >
            <ChevronLeft className="w-5 h-5" />
          </NavLink>
          <div className="min-w-0">
            <h1 className="font-semibold tracking-display-ko text-xl tracking-tight truncate keep-all">
              {showcase.title || t("editor_field_title")}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge
                variant={isPublished ? "default" : "secondary"}
                className="rounded-full text-[10px] px-2 py-0"
              >
                {isPublished
                  ? t("list_status_published")
                  : t("list_status_draft")}
              </Badge>
              {isPublished && (
                <span className="text-xs text-muted-foreground">
                  /{showcase.slug}
                </span>
              )}
              {savingField && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {tCommon("save")}…
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isPublished && (
            <a
              href={`/showcase/${showcase.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-input text-xs px-4 py-1.5 hover:bg-accent inline-flex items-center gap-1.5"
            >
              <Eye className="w-3.5 h-3.5" />
              {t("list_share_link")}
            </a>
          )}
          {canPublish && isPublished && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-full text-xs"
              disabled={publishing}
              onClick={handleUnpublish}
            >
              {t("editor_unpublish_button")}
            </Button>
          )}
          {canPublish && !isPublished && (
            <Button
              size="sm"
              className="rounded-full text-xs px-4"
              disabled={!canPublishNow || publishing}
              onClick={handlePublish}
            >
              {publishing && (
                <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
              )}
              {t("editor_publish_button")}
            </Button>
          )}
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-8 py-10 space-y-12">
        {/* ── Metadata ─────────────────────────────────────────── */}
        <Section title={t("editor_section_metadata")}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FieldRow label={t("editor_field_title")}>
              <Input
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={onBlurTitle}
                className="font-medium"
              />
            </FieldRow>
            <FieldRow label={t("editor_field_subtitle")}>
              <Input
                value={subtitleDraft}
                onChange={(e) => setSubtitleDraft(e.target.value)}
                onBlur={onBlurSubtitle}
              />
            </FieldRow>
            <FieldRow
              label={t("editor_field_slug")}
              hint={t("editor_field_slug_help")}
            >
              <div className="flex gap-2">
                <Input
                  value={slugDraft}
                  onChange={(e) => setSlugDraft(e.target.value)}
                  onBlur={onBlurSlug}
                  className="font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full text-xs shrink-0"
                  onClick={autoSlug}
                >
                  Auto
                </Button>
              </div>
            </FieldRow>
            <FieldRow label={t("editor_field_client_name")}>
              <Input
                value={clientNameDraft}
                onChange={(e) => setClientNameDraft(e.target.value)}
                onBlur={onBlurClientName}
                placeholder={
                  showcase.client_name_public
                    ? undefined
                    : t("editor_field_client_name_hidden_note")
                }
              />
            </FieldRow>
          </div>
        </Section>

        {/* ── Cover ────────────────────────────────────────────── */}
        <Section title={t("editor_section_cover")}>
          <div className="flex items-start gap-6">
            <div className="w-60 h-40 rounded-md bg-muted overflow-hidden flex items-center justify-center text-xs text-muted-foreground shrink-0 border border-border">
              {coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={coverUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                t("editor_cover_picker_label")
              )}
            </div>
            <p className="text-sm text-muted-foreground keep-all max-w-md">
              {t("editor_cover_picker_label")}
            </p>
          </div>
        </Section>

        {/* ── Narrative ────────────────────────────────────────── */}
        <Section title={t("editor_section_narrative")}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-muted-foreground keep-all">
              {t("editor_narrative_help")}
            </p>
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "text-xs tabular-nums",
                  hasNarrative ? "text-muted-foreground" : "text-destructive",
                )}
              >
                {t("editor_narrative_chars", { count: narrativeLen })}
              </span>
              <button
                type="button"
                onClick={() => setNarrativePreview((v) => !v)}
                className="text-xs underline decoration-muted-foreground/40 underline-offset-4 hover:decoration-foreground"
              >
                {t("editor_narrative_preview")}
              </button>
            </div>
          </div>
          {narrativePreview ? (
            <div className="min-h-[12rem] border border-border rounded-md px-4 py-3 whitespace-pre-wrap text-sm keep-all">
              {narrativeDraft || (
                <span className="text-muted-foreground">—</span>
              )}
            </div>
          ) : (
            <Textarea
              value={narrativeDraft}
              onChange={(e) => setNarrativeDraft(e.target.value)}
              onBlur={onBlurNarrative}
              rows={12}
              className="font-mono text-sm"
            />
          )}
        </Section>

        {/* ── Media grid ───────────────────────────────────────── */}
        <Section title={t("editor_section_media")}>
          <p className="text-sm text-muted-foreground mb-4 keep-all">
            {t("editor_media_intro")}
          </p>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={media.map((m) => m.id)}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {media.map((m) => (
                  <MediaTile
                    key={m.id}
                    item={m}
                    signedUrl={m.storage_path ? mediaUrlMap[m.storage_path] : undefined}
                    isCover={
                      (showcase.cover_media_storage_path ?? null) ===
                        (m.storage_path ?? null) &&
                      (showcase.cover_media_external_url ?? null) ===
                        (m.external_url ?? null)
                    }
                    onRemove={() => handleRemove(m.id)}
                    onSetCover={() => handleSetCover(m.id)}
                    onCaptionBlur={(cap) => handleCaptionBlur(m.id, cap)}
                    captionPlaceholder={t(
                      "editor_media_caption_placeholder",
                    )}
                    setCoverLabel={t("editor_media_set_cover")}
                  />
                ))}

                {/* Add tile */}
                <div className="border border-dashed border-border rounded-md p-4 flex flex-col gap-2 items-center justify-center text-sm text-muted-foreground min-h-[220px]">
                  <Plus className="w-5 h-5" />
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full text-xs"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImageIcon className="w-3.5 h-3.5 mr-1.5" />
                    {t("editor_media_add")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-full text-xs"
                    onClick={() => setEmbedDialogOpen(true)}
                  >
                    <LinkIcon className="w-3.5 h-3.5 mr-1.5" />
                    {t("editor_media_external_url_label")}
                  </Button>
                </div>
              </div>
            </SortableContext>
          </DndContext>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={handleUpload}
          />

          <Dialog open={embedDialogOpen} onOpenChange={setEmbedDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {t("editor_media_external_url_label")}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                <Input
                  value={embedUrlDraft}
                  onChange={(e) => setEmbedUrlDraft(e.target.value)}
                  placeholder="https://youtube.com/..."
                  className="font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground keep-all">
                  {t("editor_media_external_url_label")}
                </p>
              </div>
              <DialogFooter>
                <Button
                  variant="ghost"
                  onClick={() => setEmbedDialogOpen(false)}
                >
                  {tCommon("cancel")}
                </Button>
                <Button
                  disabled={embedSaving || !embedUrlDraft.trim()}
                  onClick={handleAddEmbed}
                >
                  {embedSaving && (
                    <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                  )}
                  {tCommon("save")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </Section>

        {/* ── Credits ──────────────────────────────────────────── */}
        <Section title={t("editor_section_credits")}>
          <p className="text-sm text-muted-foreground mb-3 keep-all">
            {t("editor_credits_help")}
          </p>
          <Textarea
            value={creditsDraft}
            onChange={(e) => setCreditsDraft(e.target.value)}
            onBlur={onBlurCredits}
            rows={6}
            className="font-mono text-sm"
          />
        </Section>

        {/* ── Badge ────────────────────────────────────────────── */}
        <Section title={t("editor_section_badge")}>
          <p className="text-sm text-muted-foreground mb-3 keep-all">
            {t("editor_badge_intro")}
          </p>
          <div className="flex items-center justify-between gap-4 p-4 border border-border rounded-md">
            <p className="text-sm keep-all">
              {showcase.made_with_yagi
                ? t("editor_badge_active_label")
                : t("editor_badge_removed_label")}
            </p>
            {showcase.made_with_yagi &&
              showcase.badge_removal_requested &&
              !canManageBadge && (
                <span className="text-xs text-muted-foreground keep-all">
                  {t("editor_badge_removal_pending")}
                </span>
              )}
            {showcase.made_with_yagi &&
              !showcase.badge_removal_requested &&
              !canManageBadge && (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full text-xs"
                  onClick={() => setBadgeDialogOpen(true)}
                >
                  {t("editor_badge_request_removal")}
                </Button>
              )}
            {canManageBadge && showcase.badge_removal_requested && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="rounded-full text-xs"
                  onClick={handleApproveBadge}
                >
                  {t("editor_badge_admin_approve")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full text-xs"
                  onClick={handleDenyBadge}
                >
                  {t("editor_badge_admin_deny")}
                </Button>
              </div>
            )}
          </div>

          <Dialog open={badgeDialogOpen} onOpenChange={setBadgeDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {t("editor_badge_request_dialog_title")}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                <Label className="keep-all">
                  {t("editor_badge_request_reason_label")}
                </Label>
                <Textarea
                  value={badgeReason}
                  onChange={(e) => setBadgeReason(e.target.value)}
                  rows={4}
                  maxLength={2000}
                />
              </div>
              <DialogFooter>
                <Button
                  variant="ghost"
                  onClick={() => setBadgeDialogOpen(false)}
                >
                  {tCommon("cancel")}
                </Button>
                <Button
                  disabled={badgeSubmitting}
                  onClick={handleRequestBadge}
                >
                  {badgeSubmitting && (
                    <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                  )}
                  {t("editor_badge_request_submit")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </Section>

        {/* ── Password ─────────────────────────────────────────── */}
        {canManagePassword && (
          <Section title={t("editor_section_password")}>
            <p className="text-sm text-muted-foreground mb-3 keep-all">
              {t("editor_password_intro")}
            </p>
            <div className="flex items-center gap-3 mb-3 text-sm">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 text-xs",
                  showcase.is_password_protected
                    ? "text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {showcase.is_password_protected ? (
                  <Check className="w-3 h-3" />
                ) : null}
                {showcase.is_password_protected
                  ? t("editor_password_active_label")
                  : t("editor_password_inactive_label")}
              </span>
            </div>
            <div className="flex items-end gap-2 max-w-md">
              <div className="flex-1">
                <Label htmlFor="showcase-password" className="keep-all">
                  {t("editor_password_field_label")}
                </Label>
                <Input
                  id="showcase-password"
                  type="password"
                  value={passwordDraft}
                  onChange={(e) => setPasswordDraft(e.target.value)}
                  className="mt-1"
                  maxLength={256}
                />
              </div>
              <Button
                size="sm"
                disabled={passwordBusy || !passwordDraft}
                onClick={handleSavePassword}
              >
                {passwordBusy && (
                  <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                )}
                {t("editor_password_save")}
              </Button>
              {showcase.is_password_protected && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={passwordBusy}
                  onClick={handleRemovePassword}
                >
                  {t("editor_password_remove")}
                </Button>
              )}
            </div>
          </Section>
        )}

        {/* ── Publish ──────────────────────────────────────────── */}
        {canPublish && !isPublished && (
          <Section title={t("editor_publish_section")}>
            <div className="border border-border rounded-md p-5 space-y-3">
              <p className="text-sm font-medium keep-all">
                {t("editor_publish_checklist_title")}
              </p>
              <ul className="space-y-1.5 text-sm">
                <ChecklistItem ok={hasCover}>
                  {t("editor_publish_check_cover")}
                </ChecklistItem>
                <ChecklistItem ok={hasMinMedia}>
                  {t("editor_publish_check_media_count")}
                </ChecklistItem>
                <ChecklistItem ok={hasNarrative}>
                  {t("editor_publish_check_narrative")}
                </ChecklistItem>
                <ChecklistItem ok={hasValidSlug}>
                  {t("editor_publish_check_slug")}
                </ChecklistItem>
              </ul>
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  disabled={!canPublishNow || publishing}
                  onClick={handlePublish}
                >
                  {publishing && (
                    <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                  )}
                  {t("editor_publish_button")}
                </Button>
              </div>
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="font-semibold tracking-display-ko text-lg tracking-tight mb-4 keep-all">
        {title}
      </h2>
      {children}
    </section>
  );
}

function FieldRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="keep-all">{label}</Label>
      {children}
      {hint && (
        <p className="text-xs text-muted-foreground keep-all">{hint}</p>
      )}
    </div>
  );
}

function ChecklistItem({
  ok,
  children,
}: {
  ok: boolean;
  children: React.ReactNode;
}) {
  return (
    <li
      className={cn(
        "flex items-center gap-2 keep-all",
        ok ? "text-foreground" : "text-destructive",
      )}
    >
      {ok ? (
        <Check className="w-4 h-4" />
      ) : (
        <X className="w-4 h-4" />
      )}
      {children}
    </li>
  );
}

type MediaTileProps = {
  item: ShowcaseMediaItem;
  signedUrl: string | undefined;
  isCover: boolean;
  onRemove: () => void;
  onSetCover: () => void;
  onCaptionBlur: (caption: string) => void;
  captionPlaceholder: string;
  setCoverLabel: string;
};

function MediaTile({
  item,
  signedUrl,
  isCover,
  onRemove,
  onSetCover,
  onCaptionBlur,
  captionPlaceholder,
  setCoverLabel,
}: MediaTileProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const transformStr = transform
    ? `translate3d(${transform.x}px, ${transform.y}px, 0) scaleX(${transform.scaleX}) scaleY(${transform.scaleY})`
    : undefined;
  const style = {
    transform: transformStr,
    transition,
  };

  const [captionDraft, setCaptionDraft] = useState(item.caption ?? "");

  const thumb =
    item.media_type === "video_embed"
      ? null
      : signedUrl ?? null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative border border-border rounded-md overflow-hidden bg-background",
        isDragging && "opacity-50",
        isCover && "ring-2 ring-foreground",
      )}
    >
      <div className="aspect-[4/3] bg-muted relative overflow-hidden">
        {thumb ? (
          item.media_type === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumb}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <video
              src={thumb}
              className="w-full h-full object-cover"
              muted
              playsInline
            />
          )
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            {item.media_type === "video_embed" ? (
              <div className="text-center px-3">
                <LinkIcon className="w-5 h-5 mx-auto mb-1" />
                <p className="text-[10px] truncate max-w-[180px] mx-auto font-mono">
                  {item.external_url}
                </p>
              </div>
            ) : item.media_type === "video_upload" ? (
              <Video className="w-5 h-5" />
            ) : (
              <ImageIcon className="w-5 h-5" />
            )}
          </div>
        )}

        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="absolute top-2 left-2 bg-background/80 backdrop-blur rounded p-1 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="drag"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>

        {/* Remove */}
        <button
          className="absolute top-2 right-2 bg-background/80 backdrop-blur rounded p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={onRemove}
          aria-label="remove"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        {isCover && (
          <Badge className="absolute bottom-2 left-2 text-[10px] rounded-full px-2 py-0">
            Cover
          </Badge>
        )}
      </div>

      <div className="p-2 space-y-1.5">
        <Input
          value={captionDraft}
          onChange={(e) => setCaptionDraft(e.target.value)}
          onBlur={() => onCaptionBlur(captionDraft)}
          placeholder={captionPlaceholder}
          className="text-xs h-8"
        />
        {!isCover && (
          <button
            type="button"
            onClick={onSetCover}
            className="text-[10px] underline decoration-muted-foreground/40 underline-offset-4 hover:decoration-foreground text-muted-foreground"
          >
            {setCoverLabel}
          </button>
        )}
      </div>
    </div>
  );
}
