import { getTranslations } from "next-intl/server";
import { Link as LinkIcon, FileText } from "lucide-react";
import { createSupabaseServer } from "@/lib/supabase/server";
import { removeReferenceFormAction } from "@/app/[locale]/app/projects/[id]/ref-actions";
import { VideoPlayer } from "@/components/project/video-player";

interface ReferenceGridProps {
  projectId: string;
}

function formatDuration(seconds: number | null): string | null {
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0) return null;
  const total = Math.round(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export async function ReferenceGrid({ projectId }: ReferenceGridProps) {
  const t = await getTranslations("refs");

  const supabase = await createSupabaseServer();

  const { data: refs } = await supabase
    .from("project_references")
    .select(
      "id, storage_path, external_url, og_title, og_description, og_image_url, caption, created_at, media_type, duration_seconds, page_count, thumbnail_path, embed_provider"
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (!refs || refs.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">—</p>;
  }

  // Generate signed URLs for storage_path + thumbnail_path in one pass.
  type RefWithUrls = (typeof refs)[number] & {
    signedUrl?: string | null;
    thumbnailSignedUrl?: string | null;
  };
  const refsWithUrls: RefWithUrls[] = await Promise.all(
    refs.map(async (ref) => {
      const [mainSigned, thumbSigned] = await Promise.all([
        ref.storage_path
          ? supabase.storage
              .from("project-references")
              .createSignedUrl(ref.storage_path, 3600)
          : Promise.resolve({ data: null }),
        ref.thumbnail_path
          ? supabase.storage
              .from("project-references")
              .createSignedUrl(ref.thumbnail_path, 3600)
          : Promise.resolve({ data: null }),
      ]);
      return {
        ...ref,
        signedUrl: mainSigned.data?.signedUrl ?? null,
        thumbnailSignedUrl: thumbSigned.data?.signedUrl ?? null,
      };
    })
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
      {refsWithUrls.map((ref) => {
        const mediaType = ref.media_type ?? "image";
        const isUploadedVideo =
          mediaType === "video" && !!ref.storage_path && !!ref.signedUrl;
        const isExternalVideo =
          mediaType === "video" && !ref.storage_path && !!ref.external_url;
        const isPdf = mediaType === "pdf";
        const isImage = mediaType === "image";

        const filename = ref.storage_path
          ? ref.storage_path.split("/").pop() ?? ref.storage_path
          : null;

        const displayTitle =
          ref.og_title ??
          (isImage || isPdf ? filename : null) ??
          ref.external_url ??
          "—";

        const durationText = formatDuration(ref.duration_seconds);

        return (
          <div
            key={ref.id}
            className="group relative border border-border rounded-lg overflow-hidden bg-background"
          >
            {/* Media area */}
            <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
              {isUploadedVideo ? (
                <VideoPlayer
                  kind="upload"
                  videoSrc={ref.signedUrl as string}
                  posterSrc={ref.thumbnailSignedUrl ?? null}
                  title={displayTitle}
                />
              ) : isExternalVideo &&
                (ref.embed_provider === "youtube" ||
                  ref.embed_provider === "vimeo") ? (
                <VideoPlayer
                  kind="embed"
                  provider={ref.embed_provider}
                  externalUrl={ref.external_url as string}
                  posterSrc={
                    ref.thumbnailSignedUrl ?? ref.og_image_url ?? null
                  }
                  title={ref.og_title ?? null}
                />
              ) : isExternalVideo &&
                (ref.embed_provider === "tiktok" ||
                  ref.embed_provider === "instagram") ? (
                <VideoPlayer
                  kind="external"
                  provider={ref.embed_provider}
                  externalUrl={ref.external_url as string}
                  posterSrc={
                    ref.thumbnailSignedUrl ?? ref.og_image_url ?? null
                  }
                  title={ref.og_title ?? null}
                />
              ) : isPdf ? (
                <a
                  href={ref.signedUrl ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={displayTitle ?? "PDF"}
                  className="group/pdf w-full h-full flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
                >
                  {ref.thumbnailSignedUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={ref.thumbnailSignedUrl}
                      alt={displayTitle ?? ""}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <FileText className="h-10 w-10 text-muted-foreground/60" />
                  )}
                </a>
              ) : isImage && ref.signedUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={ref.signedUrl}
                  alt={displayTitle ?? ""}
                  className="w-full h-full object-cover"
                />
              ) : ref.og_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={ref.og_image_url}
                  alt={displayTitle ?? ""}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center w-full h-full bg-muted">
                  <LinkIcon className="h-6 w-6 text-muted-foreground/40" />
                </div>
              )}
            </div>

            {/* Card body */}
            <div className="p-3 space-y-1">
              {displayTitle && (
                <p className="text-sm font-medium text-foreground line-clamp-2 keep-all">
                  {displayTitle}
                </p>
              )}
              {ref.og_description && (
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {ref.og_description}
                </p>
              )}
              {mediaType === "video" && durationText && (
                <p className="text-xs text-muted-foreground">
                  {t("ref_duration_label")}: {durationText}
                </p>
              )}
              {isPdf && typeof ref.page_count === "number" && (
                <p className="text-xs text-muted-foreground">
                  {t("ref_pages_label")}: {ref.page_count}
                </p>
              )}
              {ref.caption && (
                <p className="text-xs text-muted-foreground/70 italic">
                  {ref.caption}
                </p>
              )}
            </div>

            {/* Remove button — visible on hover */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <form action={removeReferenceFormAction}>
                <input type="hidden" name="referenceId" value={ref.id} />
                <button
                  type="submit"
                  className="rounded-full bg-background/90 border border-border px-2 py-1 text-xs text-foreground uppercase tracking-[0.1em] hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors"
                >
                  {t("remove")}
                </button>
              </form>
            </div>
          </div>
        );
      })}
    </div>
  );
}
