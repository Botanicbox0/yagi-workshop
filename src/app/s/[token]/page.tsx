import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { loadShareData } from "@/lib/share/share-data";
import { FastFeedbackBar } from "@/components/share/fast-feedback-bar";
import { CommentForm } from "@/components/share/comment-form";
import { RevisionCompare } from "@/components/share/revision-compare";
import { ApproveButton } from "@/components/share/approve-button";
import type { FrameRow, ReactionRow, CommentRow, ReferenceRow } from "@/lib/share/share-data";

// ─── Locale detection ────────────────────────────────────────────────────────

function detectLocale(headersList: Headers): "ko" | "en" {
  const accept = headersList.get("accept-language") ?? "";
  return accept.toLowerCase().startsWith("ko") ? "ko" : "en";
}

// ─── Props ───────────────────────────────────────────────────────────────────

type Props = { params: Promise<{ token: string }> };

// ─── generateMetadata ────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const data = await loadShareData(token);

  const title = data
    ? `${data.projectTitle} · Pre-production Preview`
    : "Pre-production Preview";

  const coverFrameId = data?.board.cover_frame_id;
  const ogImageUrl =
    (coverFrameId && data?.mediaUrls[coverFrameId]) ??
    (data?.frames[0] ? data.mediaUrls[data.frames[0].id] : undefined);

  return {
    title,
    openGraph: {
      title,
      description: "Review and share your feedback on this pre-production board.",
      ...(ogImageUrl ? { images: [{ url: ogImageUrl }] } : {}),
    },
    robots: { index: false, follow: false },
  };
}

// ─── NoLongerShared ───────────────────────────────────────────────────────────

async function NoLongerShared({ locale }: { locale: "ko" | "en" }) {
  const t = await getTranslations({ locale, namespace: "share" });
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center space-y-3">
        <p className="text-lg font-semibold text-foreground">{t("no_longer_shared")}</p>
        <p className="text-sm text-muted-foreground">yagiworkshop.xyz</p>
      </div>
    </div>
  );
}

// ─── FrameMedia ───────────────────────────────────────────────────────────────

function FrameMedia({
  frame,
  mediaUrl,
}: {
  frame: FrameRow;
  mediaUrl?: string;
}) {
  if (frame.media_type === "image") {
    if (!mediaUrl) return null;
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={mediaUrl}
        alt={frame.caption ?? ""}
        className="w-full rounded-lg object-contain max-h-[600px]"
      />
    );
  }

  if (frame.media_type === "video_upload") {
    if (!mediaUrl) return null;
    return (
      <video src={mediaUrl} controls className="w-full rounded-lg max-h-[600px]" />
    );
  }

  if (frame.media_type === "video_embed") {
    const provider = frame.media_embed_provider?.toLowerCase();
    const externalUrl = frame.media_external_url;
    if (!externalUrl) return null;

    if (provider === "youtube") {
      // Convert watch URL to embed URL
      const embedUrl = externalUrl
        .replace("watch?v=", "embed/")
        .replace("youtu.be/", "www.youtube.com/embed/");
      return (
        <div className="relative w-full overflow-hidden rounded-lg" style={{ paddingTop: "56.25%" }}>
          <iframe
            src={embedUrl}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
          />
        </div>
      );
    }

    if (provider === "vimeo") {
      const videoId = externalUrl.split("/").pop();
      return (
        <div className="relative w-full overflow-hidden rounded-lg" style={{ paddingTop: "56.25%" }}>
          <iframe
            src={`https://player.vimeo.com/video/${videoId}`}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
          />
        </div>
      );
    }

    // TikTok / Instagram / other: show thumbnail + link
    const thumbUrl = frame.thumbnail_path ? mediaUrl : undefined;
    return (
      <div className="relative w-full rounded-lg overflow-hidden bg-muted">
        {thumbUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbUrl} alt="" className="w-full object-cover max-h-[400px]" />
        ) : (
          <div className="flex h-40 items-center justify-center text-muted-foreground text-sm">
            {provider ?? "video"}
          </div>
        )}
        <a
          href={externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute inset-0 flex items-end p-3 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <span className="rounded-full bg-foreground/70 px-3 py-1 text-xs text-background backdrop-blur-sm">
            Open on {provider ?? "external site"} →
          </span>
        </a>
      </div>
    );
  }

  return null;
}

// ─── ReferenceThumbnails ──────────────────────────────────────────────────────

function ReferenceThumbnails({
  refIds,
  references,
  mediaUrls,
}: {
  refIds: string[];
  references: ReferenceRow[];
  mediaUrls: Record<string, string>;
}) {
  const refs = refIds
    .map((id) => references.find((r) => r.id === id))
    .filter(Boolean) as ReferenceRow[];

  if (refs.length === 0) return null;

  return (
    <div className="mt-3 flex gap-2 flex-wrap">
      {refs.map((ref) => {
        const thumbUrl =
          mediaUrls[`ref_thumb_${ref.id}`] ??
          ref.og_image_url ??
          mediaUrls[`ref_${ref.id}`];
        const label = ref.caption ?? ref.og_title ?? "";
        return (
          <div
            key={ref.id}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-muted px-2 py-1"
            title={label}
          >
            {thumbUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={thumbUrl}
                alt={label}
                className="h-8 w-8 rounded object-cover flex-shrink-0"
              />
            ) : (
              <div className="h-8 w-8 rounded bg-muted flex-shrink-0" />
            )}
            {label && (
              <span className="text-xs text-muted-foreground max-w-[100px] truncate">
                {label}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── CommentsSection ──────────────────────────────────────────────────────────

async function CommentsSection({
  comments,
  locale,
}: {
  comments: CommentRow[];
  locale: "ko" | "en";
}) {
  const t = await getTranslations({ locale, namespace: "share" });

  if (comments.length === 0) {
    return (
      <p className="text-sm text-muted-foreground mt-2">{t("comments_empty")}</p>
    );
  }

  // Show unresolved first, then recently resolved (last 5 resolved)
  const unresolved = comments.filter((c) => !c.resolved_at);
  const resolved = comments
    .filter((c) => !!c.resolved_at)
    .sort(
      (a, b) =>
        new Date(b.resolved_at!).getTime() - new Date(a.resolved_at!).getTime(),
    )
    .slice(0, 5);

  const displayComments = [...unresolved, ...resolved];

  return (
    <div className="mt-3 space-y-3">
      <p className="text-sm font-semibold text-foreground">{t("comments_title")}</p>
      {displayComments.map((c) => (
        <div
          key={c.id}
          className="rounded-lg border border-border bg-muted px-4 py-3 space-y-1"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">
              {c.author_display_name}
            </span>
            {c.resolved_at && (
              <span className="rounded-full bg-success px-2 py-0.5 text-xs text-success-foreground">
                {t("resolved_badge")}
              </span>
            )}
            <span className="ml-auto text-xs text-muted-foreground">
              {new Date(c.created_at).toLocaleDateString(
                locale === "ko" ? "ko-KR" : "en-US",
              )}
            </span>
          </div>
          <p className="whitespace-pre-wrap text-sm text-foreground [word-break:keep-all]">
            {c.body}
          </p>
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SharePage({ params }: Props) {
  const { token } = await params;

  const headersList = await headers();
  const locale = detectLocale(headersList);

  const data = await loadShareData(token);

  if (!data) {
    return <NoLongerShared locale={locale} />;
  }

  const { board, projectTitle, frames, allFrames, reactions, comments, references, mediaUrls } =
    data;

  const t = await getTranslations({ locale, namespace: "share" });

  // Build revision history map: revision_group → sorted historical revisions
  const revisionHistoryMap: Record<string, FrameRow[]> = {};
  for (const f of allFrames) {
    if (!revisionHistoryMap[f.revision_group]) {
      revisionHistoryMap[f.revision_group] = [];
    }
    revisionHistoryMap[f.revision_group].push(f);
  }

  // Build reactions map: frameId → { like: n, dislike: n, needs_change: n }
  const reactionCounts: Record<
    string,
    { like: number; dislike: number; needs_change: number }
  > = {};
  for (const r of reactions as ReactionRow[]) {
    if (!reactionCounts[r.frame_id]) {
      reactionCounts[r.frame_id] = { like: 0, dislike: 0, needs_change: 0 };
    }
    if (r.reaction === "like") reactionCounts[r.frame_id].like++;
    else if (r.reaction === "dislike") reactionCounts[r.frame_id].dislike++;
    else if (r.reaction === "needs_change")
      reactionCounts[r.frame_id].needs_change++;
  }

  // Build comments map: frameId → comments
  const commentsByFrame: Record<string, CommentRow[]> = {};
  for (const c of comments as CommentRow[]) {
    if (!commentsByFrame[c.frame_id]) commentsByFrame[c.frame_id] = [];
    commentsByFrame[c.frame_id].push(c);
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001";

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3">
          <span className="text-xs font-semibold uppercase tracking-widest text-foreground">
            YAGI WORKSHOP
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground">{t("header_label")}</span>
          <span className="text-sm font-medium text-foreground truncate">
            {projectTitle}
          </span>
        </div>
      </header>

      {/* ── Layout: main content + sticky frame index ── */}
      <div className="mx-auto max-w-5xl px-4 py-8 lg:flex lg:gap-8">
        {/* Main content */}
        <main className="flex-1 min-w-0 space-y-16">
          {/* Welcome banner */}
          <section className="space-y-1">
            <h1 className="font-semibold tracking-display-ko text-3xl text-foreground">
              {t("welcome_title")}
            </h1>
            <p className="text-muted-foreground">{t("welcome_sub")}</p>
          </section>

          {/* Frame sections */}
          {frames.map((frame, idx) => {
            const mediaUrl = mediaUrls[frame.id];
            const thumbUrl = mediaUrls[`${frame.id}__thumb`];
            const frameReactionCounts = reactionCounts[frame.id] ?? {
              like: 0,
              dislike: 0,
              needs_change: 0,
            };
            const frameComments = commentsByFrame[frame.id] ?? [];

            // Historical revisions (not the current one)
            const groupRevisions = revisionHistoryMap[frame.revision_group] ?? [];
            const historicalRevisions = groupRevisions
              .filter((r) => !r.is_current_revision)
              .map((r) => ({
                id: r.id,
                url: mediaUrls[r.id] ?? mediaUrls[`${r.id}__thumb`] ?? null,
                caption: r.caption,
                revision: r.revision,
                media_type: r.media_type,
              }));

            const currentRevisionEntry = {
              id: frame.id,
              url: mediaUrl ?? thumbUrl ?? null,
              caption: frame.caption,
              revision: frame.revision,
              media_type: frame.media_type,
            };

            return (
              <section
                key={frame.id}
                id={`frame-${idx + 1}`}
                className="scroll-mt-20 space-y-3"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground tabular-nums">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  {historicalRevisions.length > 0 && (
                    <RevisionCompare
                      current={currentRevisionEntry}
                      historical={historicalRevisions}
                    />
                  )}
                </div>

                {/* Hero media */}
                <FrameMedia frame={frame} mediaUrl={mediaUrl ?? thumbUrl} />

                {/* Caption */}
                {frame.caption && (
                  <p className="whitespace-pre-wrap text-base text-foreground [word-break:keep-all]">
                    {frame.caption}
                  </p>
                )}

                {/* Director's note */}
                {frame.director_note && (
                  <p className="whitespace-pre-wrap text-sm italic text-muted-foreground [word-break:keep-all]">
                    {frame.director_note}
                  </p>
                )}

                {/* Linked references */}
                {(frame.reference_ids?.length ?? 0) > 0 && (
                  <ReferenceThumbnails
                    refIds={frame.reference_ids}
                    references={references}
                    mediaUrls={mediaUrls}
                  />
                )}

                {/* Fast Feedback Bar */}
                <FastFeedbackBar
                  frameId={frame.id}
                  token={token}
                  initial={frameReactionCounts}
                />

                {/* Comment form + list */}
                <CommentForm frameId={frame.id} token={token} />
                <CommentsSection comments={frameComments} locale={locale} />
              </section>
            );
          })}

          {/* Footer CTA */}
          <footer className="border-t border-border pt-10 pb-16 text-center">
            {board.status === "approved" ? (
              <p className="text-base font-semibold text-success-foreground">
                {t("approved_thanks")}
              </p>
            ) : board.status === "shared" ? (
              <div className="space-y-3">
                <ApproveButton token={token} />
              </div>
            ) : null}
            <p className="mt-6 text-xs text-muted-foreground">
              <a
                href={siteUrl}
                className="hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-sm"
                target="_blank"
                rel="noopener noreferrer"
              >
                yagiworkshop.xyz
              </a>
            </p>
          </footer>
        </main>

        {/* ── Sticky frame index (desktop only) ── */}
        {frames.length > 1 && (
          <nav className="hidden lg:block w-12 flex-shrink-0">
            <div className="sticky top-24 flex flex-col gap-3 items-center">
              {frames.map((_, idx) => (
                <a
                  key={idx}
                  href={`#frame-${idx + 1}`}
                  className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors tabular-nums focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-sm"
                >
                  {idx + 1}
                </a>
              ))}
            </div>
          </nav>
        )}
      </div>
    </div>
  );
}
