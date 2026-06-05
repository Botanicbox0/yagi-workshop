import { getTranslations } from "next-intl/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { briefObjectPublicUrl } from "@/lib/r2/client";
import { fetchVideoMetadata } from "@/lib/oembed";
import {
  DeliverablesReviewPanel,
  type DeliveryReviewDeliverable,
  type DeliverablesScopeSummary,
} from "@/components/project-detail/deliverables-review-panel";
import { DeliverableShareControls } from "@/components/project-detail/deliverable-share-controls";
import type {
  AnnotationCoords,
  AnnotationShape,
  AnnotationStatus,
  AnnotationVisibility,
  DeliverableAnnotation,
} from "@/components/project-detail/deliverable-annotations";
import type {
  ThreadAttachment,
  ThreadAuthorRole,
  ThreadMessage,
} from "@/components/project/thread-panel";
import { buildReleasedRoundMap } from "@/lib/project-deliverables/release-state";
import { refreshReadyDeliverableStreams } from "@/lib/stream/deliverable-status";

type Props = {
  projectId: string;
  revisionRoundsLimit: number;
  scopeSummary: DeliverablesScopeSummary;
  canReview: boolean;
  isStudioContext: boolean;
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
  review_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  submitted_by_profile:
    | { display_name: string | null; handle: string | null }
    | Array<{ display_name: string | null; handle: string | null }>
    | null;
};

type AnnotationRow = {
  id: string;
  project_id: string;
  deliverable_id: string;
  asset_index: number;
  seq: number;
  shape: string;
  coords: unknown;
  visibility: string;
  status: string;
  timestamp_sec: number | null;
  thread_id: string;
  created_by: string;
  created_at: string;
};

type MessageRow = {
  id: string;
  thread_id: string;
  author_id: string;
  body: string | null;
  visibility: string;
  created_at: string;
};

type ProfileRow = {
  id: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
};

type RoleRow = {
  user_id: string;
  role: string;
  workspace_id: string | null;
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

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3003";
}

export async function DeliverablesTab({
  projectId,
  revisionRoundsLimit,
  scopeSummary,
  canReview,
  isStudioContext,
  locale,
}: Props) {
  const t = await getTranslations({
    locale,
    namespace: "project_detail.deliverables",
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generated types lag review fields shape in nested selects
  const supabase = (await createSupabaseServer()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: projectShare } = (await supabase
    .from("projects")
    .select("deliverable_share_token, deliverable_share_enabled")
    .eq("id", projectId)
    .maybeSingle()) as {
    data: {
      deliverable_share_token: string | null;
      deliverable_share_enabled: boolean | null;
    } | null;
  };

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
      review_note,
      reviewed_by,
      reviewed_at,
      created_at,
      submitted_by_profile:profiles!project_deliverables_submitted_by_fkey(display_name, handle)
    `,
    )
    .eq("project_id", projectId);

  if (!isStudioContext) {
    deliverablesQuery = deliverablesQuery.not("released_at", "is", null);
  }

  const { data: rowsRaw } = (await deliverablesQuery
    .order("version", { ascending: false })
    .order("created_at", { ascending: false })) as {
    data: DeliverableRow[] | null;
  };
  const refreshedStreams = await refreshReadyDeliverableStreams(rowsRaw ?? [], {
    projectId,
  });

  const releasedRoundById = buildReleasedRoundMap(
    (rowsRaw ?? []).map((row) => ({
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
      isStudioContext ? "deliverable_seen_by_client" : "deliverable_seen_by_yagi";
    await Promise.all(
      releasedDeliverableIds.map(async (deliverableId) => {
        const { data, error } = await supabase.rpc(rpcName, {
          p_deliverable_id: deliverableId,
        });
        if (error || data !== true) return;
        seenFlagsByDeliverable.set(
          deliverableId,
          isStudioContext ? { seenByClient: true } : { seenByYagi: true },
        );
      }),
    );
  }
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

  const deliverableIds = (rowsRaw ?? []).map((row) => row.id);
  const annotationsByDeliverable = new Map<string, DeliverableAnnotation[]>();
  if (deliverableIds.length > 0) {
    const { data: annotationRowsRaw } = (await supabase
      .from("deliverable_annotations")
      .select(
        "id, project_id, deliverable_id, asset_index, seq, shape, coords, visibility, status, timestamp_sec, thread_id, created_by, created_at",
      )
      .eq("project_id", projectId)
      .in("deliverable_id", deliverableIds)
      .order("asset_index", { ascending: true })
      .order("seq", { ascending: true })) as {
      data: AnnotationRow[] | null;
    };

    const annotationRows =
      isStudioContext
        ? (annotationRowsRaw ?? [])
        : (annotationRowsRaw ?? []).filter((row) => row.visibility === "client");
    const threadIds = annotationRows.map((annotation) => annotation.thread_id);
    const messagesByThread = new Map<string, ThreadMessage[]>();
    if (threadIds.length > 0) {
      const { data: messageRowsRaw } = (await supabase
        .from("thread_messages")
        .select("id, thread_id, author_id, body, visibility, created_at")
        .in("thread_id", threadIds)
        .order("created_at", { ascending: true })) as {
        data: MessageRow[] | null;
      };
      const messageRows = messageRowsRaw ?? [];
      const authorIds = [...new Set(messageRows.map((message) => message.author_id))];
      const [{ data: profilesRaw }, { data: roleRowsRaw }, { data: projectRow }] =
        await Promise.all([
          authorIds.length > 0
            ? supabase
                .from("profiles")
                .select("id, handle, display_name, avatar_url")
                .in("id", authorIds)
            : Promise.resolve({ data: [] as ProfileRow[] }),
          authorIds.length > 0
            ? supabase
                .from("user_roles")
                .select("user_id, role, workspace_id")
                .in("user_id", authorIds)
            : Promise.resolve({ data: [] as RoleRow[] }),
          supabase
            .from("projects")
            .select("workspace_id")
            .eq("id", projectId)
            .maybeSingle(),
        ]);

      const profileMap = new Map(
        ((profilesRaw ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]),
      );
      const projectWorkspaceId = projectRow?.workspace_id ?? null;
      const roleMap = new Map<string, ThreadAuthorRole>();
      for (const id of authorIds) roleMap.set(id, "member");
      const priority: Record<ThreadAuthorRole, number> = {
        yagi: 3,
        admin: 2,
        client: 1,
        member: 0,
      };
      for (const role of (roleRowsRaw ?? []) as RoleRow[]) {
        const scoped =
          role.workspace_id === null || role.workspace_id === projectWorkspaceId;
        if (!scoped) continue;
        const current = roleMap.get(role.user_id) ?? "member";
        const next: ThreadAuthorRole | null =
          role.role === "yagi_admin"
            ? "yagi"
            : role.role === "workspace_admin"
              ? "admin"
              : role.role === "workspace_member"
                ? "client"
                : null;
        if (next && priority[next] > priority[current]) {
          roleMap.set(role.user_id, next);
        }
      }

      for (const message of messageRows) {
        const profile = profileMap.get(message.author_id);
        const threadMessages = messagesByThread.get(message.thread_id) ?? [];
        threadMessages.push({
          ...message,
          author: profile
            ? {
                ...profile,
                role: roleMap.get(message.author_id) ?? "member",
              }
            : null,
          attachments: [] as ThreadAttachment[],
        });
        messagesByThread.set(message.thread_id, threadMessages);
      }
    }

    for (const row of annotationRows) {
      const messages = messagesByThread.get(row.thread_id) ?? [];
      const annotation: DeliverableAnnotation = {
        id: row.id,
        projectId: row.project_id,
        deliverableId: row.deliverable_id,
        assetIndex: row.asset_index,
        seq: row.seq,
        shape: row.shape as AnnotationShape,
        coords: row.coords as AnnotationCoords,
        visibility: row.visibility as AnnotationVisibility,
        status: row.status as AnnotationStatus,
        timestampSec:
          typeof row.timestamp_sec === "number" ? row.timestamp_sec : null,
        threadId: row.thread_id,
        createdAt: row.created_at,
        createdBy: row.created_by,
        preview: messages.find((message) => message.body)?.body ?? null,
        messageCount: messages.length,
        messages,
      };
      const list = annotationsByDeliverable.get(row.deliverable_id) ?? [];
      list.push(annotation);
      annotationsByDeliverable.set(row.deliverable_id, list);
    }
  }

  const deliverables: DeliveryReviewDeliverable[] = await Promise.all(
    (rowsRaw ?? []).map(async (row) => {
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
        reviewNote: row.review_note,
        reviewedAt: row.reviewed_at,
        reviewedBy: row.reviewed_by ? reviewerMap.get(row.reviewed_by) ?? null : null,
        createdAt: row.created_at,
        submittedBy: profileName(row.submitted_by_profile),
        storageAssets: (row.storage_paths ?? []).map((key) => ({
          key,
          url: briefObjectPublicUrl(key),
          kind: detectStorageKind(key),
          streamUid: key === firstVideoKey ? row.stream_uid : null,
          streamStatus: key === firstVideoKey ? streamStatus : null,
        })),
        externalAssets,
        annotations: annotationsByDeliverable.get(row.id) ?? [],
      };
    }),
  );

  return (
    <div className="space-y-5">
      {isStudioContext ? (
        <DeliverableShareControls
          projectId={projectId}
          enabled={projectShare?.deliverable_share_enabled === true}
          initialUrl={
            projectShare?.deliverable_share_token
              ? `${siteUrl()}/s/d/${projectShare.deliverable_share_token}`
              : null
          }
          labels={{
            title: t("share.title"),
            description: t("share.description"),
            create: t("share.create"),
            copy: t("share.copy"),
            rotate: t("share.rotate"),
            unshare: t("share.unshare"),
            working: t("share.working"),
            copied: t("share.copied"),
            success: t("share.success"),
            error: t("share.error"),
            noReleased: t("share.no_released"),
          }}
        />
      ) : null}
      <DeliverablesReviewPanel
        projectId={projectId}
        deliverables={deliverables}
        revisionRoundsLimit={revisionRoundsLimit}
        releasedCount={releasedCount}
        scopeSummary={scopeSummary}
        canReview={canReview}
        currentUserId={user.id}
        isYagiAdmin={isStudioContext}
        locale={locale}
        labels={{
        title: t("title"),
        subtitle: t("subtitle"),
        finalCount: t("final_count", { count: "{count}" }),
        emptyTitle: t("empty.title"),
        emptySub: t("empty.sub"),
        version: t("version", { version: "{version}" }),
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
        scopeIncludedRevisions: t("scopeIncludedRevisions", { n: "{n}" }),
        scopeControlLabel: t("scopeControlLabel"),
        scopeControlSave: t("scopeControlSave"),
        scopeControlSaving: t("scopeControlSaving"),
        scopeControlSaved: t("scopeControlSaved"),
        scopeControlError: t("scopeControlError"),
        extendScopeTitle: t("extendScopeTitle"),
        extendScopeBody: t("extendScopeBody", {
          limit: "{limit}",
          limitPlusOne: "{limitPlusOne}",
        }),
        extendScopeConfirm: t("extendScopeConfirm"),
        extendScopeCancel: t("extendScopeCancel"),
        agreedScope: t("agreedScope"),
        scopeDeliverableTypes: t("scopeDeliverableTypes"),
        scopeChannels: t("scopeChannels"),
        scopeRatioFormat: t("scopeRatioFormat"),
        roundOverage: t("round_overage"),
        turn: {
          internal: t("turn.internal"),
          client_review: t("turn.client_review", { round: "{round}" }),
          yagi_revision: t("turn.yagi_revision", { round: "{round}" }),
          approved: t("turn.approved"),
        },
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
        revertReview: t("review.revert_review"),
        noteLabel: t("review.note_label"),
        notePlaceholder: t("review.note_placeholder"),
        submitting: t("review.submitting"),
        success: t("review.success"),
        errors: {
          validation: t("review.errors.validation"),
          forbidden: t("review.errors.forbidden"),
          releaseFailed: t("review.errors.release_failed"),
          generic: t("review.errors.generic"),
        },
        video: {
          play: t("video.play"),
          pause: t("video.pause"),
          speed: t("video.speed"),
          frameBack: t("video.frame_back"),
          frameForward: t("video.frame_forward"),
          editTimecode: t("video.edit_timecode"),
          currentTime: t("video.current_time"),
          streamProcessing: t("video.stream_processing"),
          commentAtCurrentPrefix: t("video.comment_at_current_prefix"),
          commentAtCurrentSuffix: t("video.comment_at_current_suffix"),
          timecode: t("annotations.timecode"),
        },
        status: {
          submitted: t("status.submitted"),
          changes_requested: t("status.changes_requested"),
          approved: t("status.approved"),
        },
        annotations: {
          title: t("annotations.title"),
          subtitle: t("annotations.subtitle"),
          hint: t("annotations.hint"),
          sortLabel: t("annotations.sort_label"),
          sortByPosition: t("annotations.sort_by_position"),
          sortByTimecode: t("annotations.sort_by_timecode"),
          filterAll: t("annotations.filter_all"),
          filterOpenOnly: t("annotations.filter_open_only"),
          draftTitle: t("annotations.draft_title"),
          bodyPlaceholder: t("annotations.body_placeholder"),
          timecode: t("annotations.timecode"),
          save: t("annotations.save"),
          saving: t("annotations.saving"),
          cancel: t("annotations.cancel"),
          listEmpty: t("annotations.list_empty"),
          open: t("annotations.open"),
          resolved: t("annotations.resolved"),
          resolve: t("annotations.resolve"),
          reopen: t("annotations.reopen"),
          threadTitle: t("annotations.thread_title"),
          clientVisibility: t("annotations.client_visibility"),
          internalVisibility: t("annotations.internal_visibility"),
          errors: {
            validation: t("annotations.errors.validation"),
            forbidden: t("annotations.errors.forbidden"),
            generic: t("annotations.errors.generic"),
          },
        },
        }}
      />
    </div>
  );
}
