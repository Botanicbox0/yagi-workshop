"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServer } from "@/lib/supabase/server";

const MAX_TIMESTAMP_SEC = 60 * 60 * 24;

const pinCoordsSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});

const boxCoordsSchema = pinCoordsSchema.extend({
  w: z.number().min(0.0001).max(1),
  h: z.number().min(0.0001).max(1),
}).refine((value) => value.x + value.w <= 1 && value.y + value.h <= 1, {
  message: "box outside asset bounds",
});

const createAnnotationSchema = z.discriminatedUnion("shape", [
  z.object({
    projectId: z.string().uuid(),
    deliverableId: z.string().uuid(),
    assetIndex: z.number().int().min(0),
    shape: z.literal("pin"),
    coords: pinCoordsSchema,
    timestampSec: z.number().min(0).max(MAX_TIMESTAMP_SEC).optional(),
    visibility: z.enum(["client", "internal"]).default("client"),
    body: z.string().trim().min(1).max(10_000),
  }),
  z.object({
    projectId: z.string().uuid(),
    deliverableId: z.string().uuid(),
    assetIndex: z.number().int().min(0),
    shape: z.literal("box"),
    coords: boxCoordsSchema,
    timestampSec: z.number().min(0).max(MAX_TIMESTAMP_SEC).optional(),
    visibility: z.enum(["client", "internal"]).default("client"),
    body: z.string().trim().min(1).max(10_000),
  }),
]);

const statusSchema = z.object({
  projectId: z.string().uuid(),
  annotationId: z.string().uuid(),
  status: z.enum(["open", "resolved"]),
});

export type CreateDeliverableAnnotationResult =
  | {
      ok: true;
      annotationId: string;
      threadId: string;
      seq: number;
    }
  | {
      ok: false;
      error: "validation" | "unauthenticated" | "forbidden" | "db";
      message?: string;
    };

export async function createDeliverableAnnotationAction(
  input: unknown,
): Promise<CreateDeliverableAnnotationResult> {
  const parsed = createAnnotationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", message: parsed.error.message };
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  const data = parsed.data;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC lands in this migration before generated types refresh
  const { data: rows, error } = await (supabase as any).rpc(
    "create_deliverable_annotation",
    {
      p_project_id: data.projectId,
      p_deliverable_id: data.deliverableId,
      p_asset_index: data.assetIndex,
      p_shape: data.shape,
      p_coords: data.coords,
      p_timestamp_sec: data.timestampSec ?? null,
      p_visibility: data.visibility,
      p_body: data.body,
    },
  );

  const row = Array.isArray(rows) ? rows[0] : rows;
  if (error || !row) {
    if (error?.code === "42501") return { ok: false, error: "forbidden" };
    console.error("[createDeliverableAnnotationAction] failed:", error);
    return { ok: false, error: "db", message: error?.message };
  }

  revalidatePath(`/[locale]/app/projects/${data.projectId}`, "page");
  return {
    ok: true,
    annotationId: row.annotation_id as string,
    threadId: row.annotation_thread_id as string,
    seq: row.annotation_seq as number,
  };
}

export type SetDeliverableAnnotationStatusResult =
  | { ok: true }
  | {
      ok: false;
      error: "validation" | "unauthenticated" | "forbidden" | "db";
      message?: string;
    };

export async function setDeliverableAnnotationStatusAction(
  input: unknown,
): Promise<SetDeliverableAnnotationStatusResult> {
  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", message: parsed.error.message };
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC lands in this migration before generated types refresh
  const { error } = await (supabase as any).rpc(
    "set_deliverable_annotation_status",
    {
      p_annotation_id: parsed.data.annotationId,
      p_status: parsed.data.status,
    },
  );

  if (error) {
    if (error.code === "42501") return { ok: false, error: "forbidden" };
    console.error("[setDeliverableAnnotationStatusAction] failed:", error);
    return { ok: false, error: "db", message: error.message };
  }

  revalidatePath(`/[locale]/app/projects/${parsed.data.projectId}`, "page");
  return { ok: true };
}
