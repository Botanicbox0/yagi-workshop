import "server-only";
import { createSupabaseService } from "@/lib/supabase/service";
import { createBriefAssetGetUrl } from "@/lib/r2/client";
import { buildReleasedRoundMap } from "@/lib/project-deliverables/release-state";

export type DeliverableShareAsset =
  | {
      kind: "storage";
      key: string;
      url: string;
      mediaKind: "image" | "video" | "file";
    }
  | {
      kind: "external";
      url: string;
      provider: "youtube" | "vimeo" | "generic";
    };

export type DeliverableShareMessage = {
  id: string;
  body: string | null;
  authorName: string | null;
  createdAt: string;
};

export type DeliverableShareAnnotation = {
  id: string;
  deliverableId: string;
  assetIndex: number;
  seq: number;
  shape: "pin" | "box";
  coords: unknown;
  status: "open" | "resolved";
  createdAt: string;
  preview: string | null;
  messages: DeliverableShareMessage[];
};

export type DeliverableShareItem = {
  id: string;
  version: number;
  status: string;
  note: string | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  releasedAt: string;
  releasedRound: number;
  createdAt: string;
  assets: DeliverableShareAsset[];
  annotations: DeliverableShareAnnotation[];
};

export type DeliverableShareData = {
  token: string;
  project: {
    id: string;
    title: string;
    status: string;
    targetDeliveryAt: string | null;
  };
  deliverables: DeliverableShareItem[];
};

type ProjectRow = {
  id: string;
  title: string;
  status: string;
  target_delivery_at: string | null;
};

type DeliverableRow = {
  id: string;
  version: number;
  status: string;
  note: string | null;
  review_note: string | null;
  reviewed_at: string | null;
  released_at: string | null;
  storage_paths: string[];
  external_urls: string[];
  created_at: string;
};

type AnnotationRow = {
  id: string;
  deliverable_id: string;
  asset_index: number;
  seq: number;
  shape: string;
  coords: unknown;
  status: string;
  thread_id: string;
  created_at: string;
};

type MessageRow = {
  id: string;
  thread_id: string;
  author_id: string;
  body: string | null;
  attachments: unknown;
  created_at: string;
  author: { display_name: string | null; handle: string | null } | null;
};

function detectStorageKind(key: string): "image" | "video" | "file" {
  const ext = key.split(".").pop()?.toLowerCase();
  if (ext && ["jpg", "jpeg", "png", "webp", "gif", "avif"].includes(ext)) {
    return "image";
  }
  if (ext && ["mp4", "mov", "webm"].includes(ext)) return "video";
  return "file";
}

function detectExternalProvider(url: string): "youtube" | "vimeo" | "generic" {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (host === "youtube.com" || host === "m.youtube.com" || host === "youtu.be") {
      return "youtube";
    }
    if (host === "vimeo.com" || host.endsWith(".vimeo.com")) return "vimeo";
  } catch {
    // fall through
  }
  return "generic";
}

function anonymousNameFromAttachments(value: unknown): string | null {
  if (!Array.isArray(value)) return null;
  const entry = value.find(
    (item) =>
      item &&
      typeof item === "object" &&
      "kind" in item &&
      (item as { kind?: unknown }).kind === "deliverable_share_author",
  ) as { name?: unknown } | undefined;
  return typeof entry?.name === "string" && entry.name.trim()
    ? entry.name.trim()
    : null;
}

export async function loadDeliverableShareData(
  token: string,
): Promise<DeliverableShareData | null> {
  const svc = createSupabaseService();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generated types lag deliverable share columns
  const service = svc as any;

  const { data: project } = (await service
    .from("projects")
    .select("id, title, status, target_delivery_at")
    .eq("deliverable_share_token", token)
    .eq("deliverable_share_enabled", true)
    .is("deleted_at", null)
    .maybeSingle()) as { data: ProjectRow | null };

  if (!project) return null;
  if (project.status === "cancelled" || project.status === "archived") return null;

  const { data: deliverableRowsRaw } = (await service
    .from("project_deliverables")
    .select(
      "id, version, status, note, review_note, reviewed_at, released_at, storage_paths, external_urls, created_at",
    )
    .eq("project_id", project.id)
    .not("released_at", "is", null)
    .order("released_at", { ascending: true })
    .order("version", { ascending: true })) as { data: DeliverableRow[] | null };

  const deliverableRows = (deliverableRowsRaw ?? []).filter(
    (row): row is DeliverableRow & { released_at: string } => Boolean(row.released_at),
  );
  if (deliverableRows.length === 0) return null;

  const releasedRoundById = buildReleasedRoundMap(
    deliverableRows.map((row) => ({
      id: row.id,
      version: row.version,
      releasedAt: row.released_at,
    })),
  );
  const deliverableIds = deliverableRows.map((row) => row.id);

  const { data: annotationRowsRaw } = (await service
    .from("deliverable_annotations")
    .select("id, deliverable_id, asset_index, seq, shape, coords, status, thread_id, created_at")
    .eq("project_id", project.id)
    .in("deliverable_id", deliverableIds)
    .eq("visibility", "client")
    .order("asset_index", { ascending: true })
    .order("seq", { ascending: true })) as { data: AnnotationRow[] | null };
  const annotationRows = annotationRowsRaw ?? [];

  const threadIds = annotationRows.map((row) => row.thread_id);
  const messagesByThread = new Map<string, DeliverableShareMessage[]>();
  if (threadIds.length > 0) {
    const { data: messageRowsRaw } = (await service
      .from("thread_messages")
      .select(
        "id, thread_id, author_id, body, attachments, created_at, author:profiles!thread_messages_author_id_fkey(display_name, handle)",
      )
      .in("thread_id", threadIds)
      .eq("visibility", "shared")
      .order("created_at", { ascending: true })) as { data: MessageRow[] | null };

    for (const row of messageRowsRaw ?? []) {
      const author = Array.isArray(row.author) ? row.author[0] : row.author;
      const list = messagesByThread.get(row.thread_id) ?? [];
      list.push({
        id: row.id,
        body: row.body,
        authorName:
          anonymousNameFromAttachments(row.attachments) ??
          author?.display_name ??
          author?.handle ??
          null,
        createdAt: row.created_at,
      });
      messagesByThread.set(row.thread_id, list);
    }
  }

  const annotationsByDeliverable = new Map<string, DeliverableShareAnnotation[]>();
  for (const row of annotationRows) {
    const messages = messagesByThread.get(row.thread_id) ?? [];
    const list = annotationsByDeliverable.get(row.deliverable_id) ?? [];
    list.push({
      id: row.id,
      deliverableId: row.deliverable_id,
      assetIndex: row.asset_index,
      seq: row.seq,
      shape: row.shape === "box" ? "box" : "pin",
      coords: row.coords,
      status: row.status === "resolved" ? "resolved" : "open",
      createdAt: row.created_at,
      preview: messages.find((message) => message.body)?.body ?? null,
      messages,
    });
    annotationsByDeliverable.set(row.deliverable_id, list);
  }

  const deliverables = await Promise.all(
    deliverableRows.map(async (row) => {
      const storageAssets = await Promise.all(
        (row.storage_paths ?? []).map(async (key) => ({
          kind: "storage" as const,
          key,
          url: await createBriefAssetGetUrl(key, 3600),
          mediaKind: detectStorageKind(key),
        })),
      );
      const externalAssets = (row.external_urls ?? []).map((url) => ({
        kind: "external" as const,
        url,
        provider: detectExternalProvider(url),
      }));

      return {
        id: row.id,
        version: row.version,
        status: row.status,
        note: row.note,
        reviewNote: row.review_note,
        reviewedAt: row.reviewed_at,
        releasedAt: row.released_at,
        releasedRound: releasedRoundById.get(row.id) ?? 1,
        createdAt: row.created_at,
        assets: [...storageAssets, ...externalAssets],
        annotations: annotationsByDeliverable.get(row.id) ?? [],
      };
    }),
  );

  return {
    token,
    project: {
      id: project.id,
      title: project.title,
      status: project.status,
      targetDeliveryAt: project.target_delivery_at,
    },
    deliverables,
  };
}
