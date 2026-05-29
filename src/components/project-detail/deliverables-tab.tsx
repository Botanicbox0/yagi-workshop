import { getTranslations } from "next-intl/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { briefObjectPublicUrl } from "@/lib/r2/client";
import { fetchVideoMetadata } from "@/lib/oembed";
import {
  DeliverablesReviewPanel,
  type DeliveryReviewDeliverable,
} from "@/components/project-detail/deliverables-review-panel";

type Props = {
  projectId: string;
  canReview: boolean;
  locale: "ko" | "en";
};

type DeliverableRow = {
  id: string;
  version: number;
  status: string;
  note: string | null;
  storage_paths: string[];
  external_urls: string[];
  review_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  submitted_by_profile:
    | { display_name: string | null; handle: string | null }
    | Array<{ display_name: string | null; handle: string | null }>
    | null;
};

function detectStorageKind(key: string): "image" | "video" | "file" {
  const ext = key.split(".").pop()?.toLowerCase();
  if (ext && ["jpg", "jpeg", "png", "webp", "gif", "avif"].includes(ext)) {
    return "image";
  }
  if (ext && ["mp4", "mov", "webm"].includes(ext)) {
    return "video";
  }
  return "file";
}

function detectExternalProvider(url: string): "youtube" | "vimeo" | "generic" {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (host === "youtube.com" || host === "m.youtube.com" || host === "youtu.be") {
      return "youtube";
    }
    if (host === "vimeo.com" || host.endsWith(".vimeo.com")) {
      return "vimeo";
    }
  } catch {
    // fall through to generic
  }
  return "generic";
}

function profileName(
  profile:
    | { display_name: string | null; handle: string | null }
    | Array<{ display_name: string | null; handle: string | null }>
    | null,
) {
  const p = Array.isArray(profile) ? profile[0] : profile;
  return p?.display_name ?? p?.handle ?? null;
}

export async function DeliverablesTab({ projectId, canReview, locale }: Props) {
  const t = await getTranslations({
    locale,
    namespace: "project_detail.deliverables",
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generated types lag review fields shape in nested selects
  const supabase = (await createSupabaseServer()) as any;
  const { data: rowsRaw } = (await supabase
    .from("project_deliverables")
    .select(
      `
      id,
      version,
      status,
      note,
      storage_paths,
      external_urls,
      review_note,
      reviewed_by,
      reviewed_at,
      created_at,
      submitted_by_profile:profiles!project_deliverables_submitted_by_fkey(display_name, handle)
    `,
    )
    .eq("project_id", projectId)
    .order("version", { ascending: false })
    .order("created_at", { ascending: false })) as {
    data: DeliverableRow[] | null;
  };

  const reviewerIds = [
    ...new Set((rowsRaw ?? []).map((row) => row.reviewed_by).filter(Boolean)),
  ] as string[];
  const reviewerMap = new Map<string, string>();
  if (reviewerIds.length > 0) {
    const { data: reviewers } = await supabase
      .from("profiles")
      .select("id, display_name, handle")
      .in("id", reviewerIds);
    for (const reviewer of reviewers ?? []) {
      reviewerMap.set(
        reviewer.id,
        reviewer.display_name ?? reviewer.handle ?? reviewer.id.slice(0, 8),
      );
    }
  }

  const deliverables: DeliveryReviewDeliverable[] = await Promise.all(
    (rowsRaw ?? []).map(async (row) => {
      const externalAssets = await Promise.all(
        (row.external_urls ?? []).map(async (url) => {
          const provider = detectExternalProvider(url);
          const metadata = provider === "generic" ? null : await fetchVideoMetadata(url);
          return {
            url,
            provider,
            title: metadata?.title ?? null,
            thumbnailUrl: metadata?.thumbnailUrl ?? null,
          };
        }),
      );

      return {
        id: row.id,
        version: row.version,
        status: row.status,
        note: row.note,
        reviewNote: row.review_note,
        reviewedAt: row.reviewed_at,
        reviewedBy: row.reviewed_by ? reviewerMap.get(row.reviewed_by) ?? null : null,
        createdAt: row.created_at,
        submittedBy: profileName(row.submitted_by_profile),
        storageAssets: (row.storage_paths ?? []).map((key) => ({
          key,
          url: briefObjectPublicUrl(key),
          kind: detectStorageKind(key),
        })),
        externalAssets,
      };
    }),
  );

  return (
    <DeliverablesReviewPanel
      projectId={projectId}
      deliverables={deliverables}
      canReview={canReview}
      locale={locale}
      labels={{
        title: t("title"),
        subtitle: t("subtitle"),
        finalCount: t("final_count", { count: "{count}" }),
        emptyTitle: t("empty.title"),
        emptySub: t("empty.sub"),
        version: t("version", { version: "{version}" }),
        final: t("final"),
        submittedBy: t("submitted_by"),
        submittedAt: t("submitted_at"),
        reviewedBy: t("reviewed_by"),
        reviewedAt: t("reviewed_at"),
        reviewNote: t("review_note"),
        versionNote: t("version_note"),
        noNote: t("no_note"),
        download: t("download"),
        openExternal: t("open_external"),
        storedFile: t("stored_file"),
        reviewTitle: t("review.title"),
        approve: t("review.approve"),
        requestChanges: t("review.request_changes"),
        noteLabel: t("review.note_label"),
        notePlaceholder: t("review.note_placeholder"),
        submitting: t("review.submitting"),
        success: t("review.success"),
        errors: {
          validation: t("review.errors.validation"),
          forbidden: t("review.errors.forbidden"),
          generic: t("review.errors.generic"),
        },
        status: {
          submitted: t("status.submitted"),
          changes_requested: t("status.changes_requested"),
          approved: t("status.approved"),
        },
      }}
    />
  );
}
