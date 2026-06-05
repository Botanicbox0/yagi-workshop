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
import { buildReleasedRoundMap } from "@/lib/project-deliverables/release-state";
import { refreshReadyDeliverableStreams } from "@/lib/stream/deliverable-status";

type Props = {
  projectId: string;
  revisionRoundsLimit: number;
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
  stream_uid: string | null;
  stream_status: string | null;
  stream_ready_at: string | null;
  released_at: string | null;
  created_at: string;
  submitted_by_profile:
    | { display_name: string | null; handle: string | null }
    | Array<{ display_name: string | null; handle: string | null }>
    | null;
};

type ThreadRow = {
  id: string;
  deliverable_id: string | null;
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

export async function BoardTab({
  projectId,
  revisionRoundsLimit,
  isYagiAdmin,
  locale,
}: Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generated types lag schema
  const supabase = (await createSupabaseServer()) as any;
  const t = await getTranslations({
    locale,
    namespace: "project_detail.versions",
  });

  let deliverablesQuery = supabase
    .from("project_deliverables")
    .select(
      `
      id,
      version,
      status,
      note,
      storage_paths,
      external_urls,
      stream_uid,
      stream_status,
      stream_ready_at,
      released_at,
      created_at,
      submitted_by_profile:profiles!project_deliverables_submitted_by_fkey(display_name, handle)
    `,
    )
    .eq("project_id", projectId);

  if (!isYagiAdmin) {
    deliverablesQuery = deliverablesQuery.not("released_at", "is", null);
  }

  const { data: rowsRaw } = (await deliverablesQuery
    .order("version", { ascending: false })
    .order("created_at", { ascending: false })) as {
    data: DeliverableRow[] | null;
  };

  const rows = rowsRaw ?? [];
  const refreshedStreams = await refreshReadyDeliverableStreams(rows, { projectId });
  const releasedRoundById = buildReleasedRoundMap(
    rows.map((row) => ({
      id: row.id,
      version: row.version,
      releasedAt: row.released_at,
    })),
  );
  const releasedCount = releasedRoundById.size;
  const seenFlagsByDeliverable = new Map<
    string,
    { seenByClient?: boolean; seenByYagi?: boolean }
  >();
  const releasedDeliverableIds = Array.from(releasedRoundById.keys());
  if (releasedDeliverableIds.length > 0) {
    const rpcName =
      isYagiAdmin === true ? "deliverable_seen_by_client" : "deliverable_seen_by_yagi";
    await Promise.all(
      releasedDeliverableIds.map(async (deliverableId) => {
        const { data, error } = await supabase.rpc(rpcName, {
          p_deliverable_id: deliverableId,
        });
        if (error || data !== true) return;
        seenFlagsByDeliverable.set(
          deliverableId,
          isYagiAdmin === true ? { seenByClient: true } : { seenByYagi: true },
        );
      }),
    );
  }
  const deliverableIds = rows.map((row) => row.id);
  const feedbackCountByDeliverable = new Map<string, number>();
  if (deliverableIds.length > 0) {
    const { data: threadsRaw } = (await supabase
      .from("project_threads")
      .select("id, deliverable_id")
      .eq("project_id", projectId)
      .in("deliverable_id", deliverableIds)) as { data: ThreadRow[] | null };

    const threads = threadsRaw ?? [];
    const threadToDeliverable = new Map(
      threads
        .filter((thread) => thread.deliverable_id)
        .map((thread) => [thread.id, thread.deliverable_id as string]),
    );
    if (threadToDeliverable.size > 0) {
      const { data: messageRows } = (await supabase
        .from("thread_messages")
        .select("thread_id")
        .in("thread_id", Array.from(threadToDeliverable.keys()))) as {
        data: Array<{ thread_id: string }> | null;
      };
      for (const message of messageRows ?? []) {
        const deliverableId = threadToDeliverable.get(message.thread_id);
        if (!deliverableId) continue;
        feedbackCountByDeliverable.set(
          deliverableId,
          (feedbackCountByDeliverable.get(deliverableId) ?? 0) + 1,
        );
      }
    }
  }

  const deliverables: VersionStackDeliverable[] = await Promise.all(
    rows.map(async (row) => {
      const refreshedStream = refreshedStreams.get(row.id);
      const streamStatus = refreshedStream?.streamStatus ?? row.stream_status;
      const firstVideoKey = (row.storage_paths ?? []).find(
        (key) => detectStorageKind(key) === "video",
      );
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
        releasedAt: row.released_at,
        releasedRound: releasedRoundById.get(row.id) ?? null,
        seenByClient: seenFlagsByDeliverable.get(row.id)?.seenByClient,
        seenByYagi: seenFlagsByDeliverable.get(row.id)?.seenByYagi,
        feedbackCount: feedbackCountByDeliverable.get(row.id) ?? 0,
        createdAt: row.created_at,
        submittedBy: profileName(row),
        storageAssets: (row.storage_paths ?? []).map((key) => ({
          key,
          url: briefObjectPublicUrl(key),
          kind: detectStorageKind(key),
          streamUid: key === firstVideoKey ? row.stream_uid : null,
          streamStatus: key === firstVideoKey ? streamStatus : null,
        })),
        externalAssets,
      };
    }),
  );

  return (
    <VersionStackTab
      projectId={projectId}
      deliverables={deliverables}
      revisionRoundsLimit={revisionRoundsLimit}
      releasedCount={releasedCount}
      canUpload={isYagiAdmin}
      isYagiAdmin={isYagiAdmin}
      locale={locale}
      labels={{
        title: t("title"),
        subtitle: t("subtitle"),
        uploadTitle: t("upload.title"),
        uploadFile: t("upload.file"),
        uploadDropzoneTitle: t("upload.dropzone_title"),
        uploadDropzoneSub: t("upload.dropzone_sub"),
        uploadSelectedFile: t("upload.selected_file"),
        uploadClearFile: t("upload.clear_file"),
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
        feedback: t("feedback"),
        feedbackCount: t("feedback_count", { count: "{count}" }),
        delivery: t("delivery"),
        final: t("final"),
        internalDraft: t("internal_draft"),
        release: t("release"),
        releasing: t("releasing"),
        releaseSuccess: t("release_success"),
        releasedAt: t("released_at"),
        initialDelivery: t("initialDelivery"),
        revisionRound: t("revisionRound", { n: "{n}" }),
        revisionUsage: t("revisionUsage", {
          used: "{used}",
          limit: "{limit}",
        }),
        seenByClient: t("seenByClient"),
        seenByYagi: t("seenByYagi"),
        extendScopeTitle: t("extendScopeTitle"),
        extendScopeBody: t("extendScopeBody", {
          limit: "{limit}",
          limitPlusOne: "{limitPlusOne}",
        }),
        extendScopeConfirm: t("extendScopeConfirm"),
        extendScopeCancel: t("extendScopeCancel"),
        roundOverage: t("round_overage"),
        turn: {
          internal: t("turn.internal"),
          client_review: t("turn.client_review", { round: "{round}" }),
          yagi_revision: t("turn.yagi_revision", { round: "{round}" }),
          approved: t("turn.approved"),
        },
        success: t("success"),
        errors: {
          assetRequired: t("errors.asset_required"),
          invalidUrl: t("errors.invalid_url"),
          fileTooLarge: t("errors.file_too_large"),
          unsupportedFileType: t("errors.unsupported_file_type"),
          uploadFailed: t("errors.upload_failed"),
          forbidden: t("errors.forbidden"),
          releaseFailed: t("errors.release_failed"),
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
