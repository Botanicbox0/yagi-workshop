import "server-only";

import { createSupabaseService } from "@/lib/supabase/service";
import { getVideo, streamConfigured } from "@/lib/stream/client";

type RefreshableDeliverableStreamRow = {
  id: string;
  stream_uid: string | null;
  stream_status: string | null;
  stream_ready_at?: string | null;
};

type RefreshedStreamStatus = {
  streamStatus: "ready";
  streamReadyAt: string;
};

const ON_FETCH_REFRESH_CACHE_MS = 5_000;
const onFetchRefreshCache = new Map<
  string,
  { checkedAt: number; readyToStream: boolean }
>();

function shouldRefreshStreamStatus(row: RefreshableDeliverableStreamRow) {
  return Boolean(
    row.stream_uid &&
      (row.stream_status === "pending" || row.stream_status == null),
  );
}

export async function refreshReadyDeliverableStreams<T extends RefreshableDeliverableStreamRow>(
  rows: T[],
  options: { projectId?: string } = {},
): Promise<Map<string, RefreshedStreamStatus>> {
  const refreshed = new Map<string, RefreshedStreamStatus>();
  if (!streamConfigured()) return refreshed;

  const rowsByUid = new Map<string, T[]>();
  for (const row of rows) {
    if (!shouldRefreshStreamStatus(row) || !row.stream_uid) continue;
    const list = rowsByUid.get(row.stream_uid) ?? [];
    list.push(row);
    rowsByUid.set(row.stream_uid, list);
  }
  if (rowsByUid.size === 0) return refreshed;

  await Promise.all(
    Array.from(rowsByUid.entries()).map(async ([uid, uidRows]) => {
      const cached = onFetchRefreshCache.get(uid);
      const readyToStream =
        cached && Date.now() - cached.checkedAt < ON_FETCH_REFRESH_CACHE_MS
          ? cached.readyToStream
          : (await getVideo(uid))?.readyToStream === true;

      onFetchRefreshCache.set(uid, {
        checkedAt: Date.now(),
        readyToStream,
      });
      if (!readyToStream) return;

      const readyAt = new Date().toISOString();
      const service = createSupabaseService();
      await Promise.all(
        uidRows.map(async (row) => {
          const streamReadyAt = row.stream_ready_at ?? readyAt;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Stream columns are applied; generated types lag.
          let updateQuery = (service as any)
            .from("project_deliverables")
            .update({
              stream_status: "ready",
              stream_ready_at: streamReadyAt,
            })
            .eq("id", row.id);

          if (options.projectId) {
            updateQuery = updateQuery.eq("project_id", options.projectId);
          }

          const { error } = await updateQuery;
          if (error) {
            console.error("[refreshReadyDeliverableStreams] update error:", error);
            return;
          }

          refreshed.set(row.id, {
            streamStatus: "ready",
            streamReadyAt,
          });
        }),
      );
    }),
  );

  return refreshed;
}
