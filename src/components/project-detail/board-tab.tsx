// Phase 8 — Work tab as version stack gallery.
//
// The historic tldraw board data remains in project_boards, but the project
// room "작업 / Versions" tab now surfaces the real review loop:
// upload -> comment -> version stack -> approve/revision later.

import { getTranslations } from "next-intl/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { briefObjectPublicUrl } from "@/lib/r2/client";
import { fetchVideoMetadata } from "@/lib/oembed";
import {
  VersionStackTab,
  type VersionStackDeliverable,
} from "@/components/project-detail/version-stack-tab";

type Props = {
  projectId: string;
  isYagiAdmin: boolean;
  /** locale forwarded to translations */
  locale: "ko" | "en";
};

type DeliverableRow = {
  id: string;
  version: number;
  status: string;
  note: string | null;
  storage_paths: string[];
  external_urls: string[];
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

function profileName(row: DeliverableRow) {
  const profile = Array.isArray(row.submitted_by_profile)
    ? row.submitted_by_profile[0]
    : row.submitted_by_profile;
  return profile?.display_name ?? profile?.handle ?? null;
}

export async function BoardTab({ projectId, isYagiAdmin, locale }: Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generated types lag schema
  const supabase = (await createSupabaseServer()) as any;
  const t = await getTranslations({
    locale,
    namespace: "project_detail.versions",
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isProjectGuest = false;
  if (user && !isYagiAdmin) {
    const { data } = await supabase.rpc("is_project_guest", {
      p_project_id: projectId,
      p_user_id: user.id,
    });
    isProjectGuest = data === true;
  }

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
      created_at,
      submitted_by_profile:profiles!project_deliverables_submitted_by_fkey(display_name, handle)
    `,
    )
    .eq("project_id", projectId)
    .order("version", { ascending: false })
    .order("created_at", { ascending: false })) as {
    data: DeliverableRow[] | null;
  };

  const rows = rowsRaw ?? [];
  const deliverables: VersionStackDeliverable[] = await Promise.all(
    rows.map(async (row) => {
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
        createdAt: row.created_at,
        submittedBy: profileName(row),
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
    <VersionStackTab
      projectId={projectId}
      deliverables={deliverables}
      canUpload={isYagiAdmin || isProjectGuest}
      locale={locale}
      labels={{
        title: t("title"),
        subtitle: t("subtitle"),
        uploadTitle: t("upload.title"),
        uploadFile: t("upload.file"),
        uploadUrl: t("upload.url"),
        uploadUrlPlaceholder: t("upload.url_placeholder"),
        uploadNote: t("upload.note"),
        uploadNotePlaceholder: t("upload.note_placeholder"),
        uploadSubmit: t("upload.submit"),
        uploadSubmitting: t("upload.submitting"),
        emptyTitle: t("empty.title"),
        emptySub: t("empty.sub"),
        version: t("version", { version: "{version}" }),
        submittedBy: t("submitted_by"),
        submittedAt: t("submitted_at"),
        versionsCount: t("versions_count", { count: "{count}" }),
        assets: t("assets", { count: "{count}" }),
        download: t("download"),
        openExternal: t("open_external"),
        storedFile: t("stored_file"),
        noNote: t("no_note"),
        success: t("success"),
        errors: {
          assetRequired: t("errors.asset_required"),
          invalidUrl: t("errors.invalid_url"),
          fileTooLarge: t("errors.file_too_large"),
          uploadFailed: t("errors.upload_failed"),
          forbidden: t("errors.forbidden"),
          generic: t("errors.generic"),
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
