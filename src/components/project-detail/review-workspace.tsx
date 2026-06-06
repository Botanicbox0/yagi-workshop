import { createSupabaseServer } from "@/lib/supabase/server";
import { briefObjectPublicUrl } from "@/lib/r2/client";
import { fetchVideoMetadata } from "@/lib/oembed";
import {
  detectExternalProvider,
  detectStorageKind,
} from "@/lib/project-deliverables/assets";
import { refreshReadyDeliverableStreams } from "@/lib/stream/deliverable-status";
import { filterVisibleThreadMessages } from "@/lib/thread/message-visibility";
import type {
  AnnotationCoords,
  AnnotationShape,
  AnnotationStatus,
  AnnotationVisibility,
} from "@/components/project-detail/deliverable-annotations";
import type { ThreadMessage } from "@/components/project/thread-panel";
import {
  ReviewWorkspaceClient,
  type ReviewWorkspaceDeliverable,
  type ReviewWorkspaceAnnotation,
  type ReviewWorkspaceThread,
} from "@/components/project-detail/review-workspace-client";

type ReviewWorkspaceProps = {
  projectId: string;
  projectTitle: string;
  isStudioContext: boolean;
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

type ThreadRow = {
  id: string;
  project_id: string;
  title: string | null;
  created_by: string;
  created_at: string;
  deliverable_id: string | null;
  annotation_id: string | null;
};

type MessageRow = {
  id: string;
  thread_id: string;
  author_id: string;
  body: string | null;
  visibility: string;
  created_at: string;
};

type ProjectThreadQuery = {
  select(columns: string): {
    eq(column: string, value: string): Promise<{ data: ThreadRow[] | null }>;
  };
};

type ProjectThreadClient = {
  from(table: "project_threads"): ProjectThreadQuery;
};

export async function ReviewWorkspace({
  projectId,
  projectTitle,
  isStudioContext,
}: ReviewWorkspaceProps) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

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
      created_at
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

  const rows = rowsRaw ?? [];
  const refreshedStreams = await refreshReadyDeliverableStreams(rows, {
    projectId,
  });

  const deliverableIds = rows.map((row) => row.id);
  const annotationsByDeliverable = new Map<string, ReviewWorkspaceAnnotation[]>();
  const threadsByAnnotation = new Map<string, ReviewWorkspaceThread>();
  const threadsByDeliverable = new Map<string, ReviewWorkspaceThread>();
  let generalThread: ReviewWorkspaceThread | null = null;

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

    const annotationRows = isStudioContext
      ? (annotationRowsRaw ?? [])
      : (annotationRowsRaw ?? []).filter((row) => row.visibility === "client");

    for (const row of annotationRows) {
      const annotation: ReviewWorkspaceAnnotation = {
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
        messages: [],
      };
      const list = annotationsByDeliverable.get(row.deliverable_id) ?? [];
      list.push(annotation);
      annotationsByDeliverable.set(row.deliverable_id, list);
    }
  }

  const threadClient = supabase as unknown as ProjectThreadClient;
  const { data: threadRowsRaw } = await threadClient
    .from("project_threads")
    .select(
      "id, project_id, title, created_by, created_at, deliverable_id, annotation_id",
    )
    .eq("project_id", projectId);
  const threadRows = threadRowsRaw ?? [];
  const threadIds = threadRows.map((thread) => thread.id);
  const messagesByThread = new Map<string, ThreadMessage[]>();

  if (threadIds.length > 0) {
    const { data: messageRowsRaw } = (await supabase
      .from("thread_messages")
      .select("id, thread_id, author_id, body, visibility, created_at")
      .in("thread_id", threadIds)
      .order("created_at", { ascending: true })) as {
      data: MessageRow[] | null;
    };
    const messageRows = filterVisibleThreadMessages(
      messageRowsRaw ?? [],
      isStudioContext,
      user.id,
    );

    for (const message of messageRows) {
      const threadMessages = messagesByThread.get(message.thread_id) ?? [];
      threadMessages.push({
        ...message,
        author: null,
        attachments: [],
      });
      messagesByThread.set(message.thread_id, threadMessages);
    }
  }

  for (const thread of threadRows) {
    const context: ReviewWorkspaceThread = {
      id: thread.id,
      deliverableId: thread.deliverable_id,
      annotationId: thread.annotation_id,
      messages: messagesByThread.get(thread.id) ?? [],
    };
    if (thread.annotation_id) {
      threadsByAnnotation.set(thread.annotation_id, context);
    } else if (thread.deliverable_id) {
      threadsByDeliverable.set(thread.deliverable_id, context);
    } else {
      generalThread = context;
    }
  }

  for (const annotations of annotationsByDeliverable.values()) {
    for (const annotation of annotations) {
      const thread = threadsByAnnotation.get(annotation.id);
      if (thread) {
        annotation.messages = thread.messages;
      }
    }
  }

  const deliverables: ReviewWorkspaceDeliverable[] = await Promise.all(
    rows.map(async (row) => {
      const refreshedStream = refreshedStreams.get(row.id);
      const streamStatus = refreshedStream?.streamStatus ?? row.stream_status;
      const firstVideoKey = (row.storage_paths ?? []).find(
        (key) => detectStorageKind(key) === "video",
      );
      const externalAssets = await Promise.all(
        (row.external_urls ?? []).map(async (url) => {
          const provider = detectExternalProvider(url);
          const metadata =
            provider === "generic" ? null : await fetchVideoMetadata(url);
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
        reviewNote: row.review_note,
        reviewedAt: row.reviewed_at,
        reviewedBy: row.reviewed_by,
        createdAt: row.created_at,
        storageAssets: (row.storage_paths ?? []).map((key) => ({
          key,
          url: briefObjectPublicUrl(key),
          kind: detectStorageKind(key),
          streamUid: key === firstVideoKey ? row.stream_uid : null,
          streamStatus: key === firstVideoKey ? streamStatus : null,
        })),
        externalAssets,
        annotations: annotationsByDeliverable.get(row.id) ?? [],
        thread:
          threadsByDeliverable.get(row.id) ?? {
            id: null,
            deliverableId: row.id,
            annotationId: null,
            messages: [],
          },
      };
    }),
  );

  return (
    <ReviewWorkspaceClient
      projectId={projectId}
      projectTitle={projectTitle}
      isStudioContext={isStudioContext}
      currentUserId={user.id}
      deliverables={deliverables}
      generalThread={
        generalThread ?? {
          id: null,
          deliverableId: null,
          annotationId: null,
          messages: [],
        }
      }
    />
  );
}
