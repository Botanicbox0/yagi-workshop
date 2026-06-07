"use server";

import { randomUUID } from "node:crypto";
import { DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  BRIEF_BUCKET,
  createBriefAssetPutUrl,
  getR2Client,
} from "@/lib/r2/client";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseService } from "@/lib/supabase/service";
import { resolveActiveWorkspace } from "@/lib/workspace/active";
import { getStudioContext } from "@/lib/workspace/studio-context.server";

const MAX_TWIN_ASSET_BYTES = 750 * 1024 * 1024;

const nullableText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((value) => (value ? value : null));

const artistWorkspaceInput = z.object({
  artistWorkspaceId: z.string().uuid().optional(),
});

const createPersonaInput = artistWorkspaceInput.extend({
  name: nullableText(120),
  personaType: nullableText(100),
  description: nullableText(1000),
  minFee: z.coerce.number().nonnegative().optional().nullable(),
  minFeePublic: z.boolean().optional(),
});

const updatePersonaInput = artistWorkspaceInput.extend({
  personaId: z.string().uuid(),
  name: nullableText(120),
  personaType: nullableText(100),
  description: nullableText(1000),
});

const updateStatusInput = artistWorkspaceInput.extend({
  personaId: z.string().uuid(),
  status: z.enum(["active", "paused"]),
});

const updateFeeInput = artistWorkspaceInput.extend({
  personaId: z.string().uuid(),
  minFee: z.coerce.number().nonnegative().optional().nullable(),
  minFeePublic: z.boolean(),
});

const deletePersonaInput = artistWorkspaceInput.extend({
  personaId: z.string().uuid(),
});

const listAssetsInput = artistWorkspaceInput.extend({
  personaId: z.string().uuid().optional(),
});

const assetUploadInput = artistWorkspaceInput.extend({
  personaId: z.string().uuid(),
  fileName: z.string().trim().min(1).max(180),
  contentType: z.string().trim().min(1).max(120),
  sizeBytes: z.coerce.number().int().positive().max(MAX_TWIN_ASSET_BYTES),
});

const createAssetInput = artistWorkspaceInput.extend({
  personaId: z.string().uuid(),
  storagePath: z.string().trim().min(1).max(500),
  fileName: nullableText(180),
  note: nullableText(500),
});

const deleteAssetInput = artistWorkspaceInput.extend({
  personaId: z.string().uuid(),
  assetId: z.string().uuid(),
});

export type TwinPersona = {
  id: string;
  artist_workspace_id: string;
  name: string | null;
  persona_type: string | null;
  description: string | null;
  status: "active" | "paused";
  min_fee: number | null;
  min_fee_public: boolean;
  cover_asset_path: string | null;
  created_at: string;
  updated_at: string;
};

export type TwinPersonaAsset = {
  id: string;
  persona_id: string;
  asset_type: string | null;
  storage_path: string;
  file_name: string | null;
  note: string | null;
  uploaded_by: string | null;
  created_at: string;
};

export type TwinPersonaActionResult =
  | {
      ok: true;
      personaId?: string;
      personas?: TwinPersona[];
      assets?: TwinPersonaAsset[];
      assetId?: string;
      upload?: {
        putUrl: string;
        storagePath: string;
        assetType: string;
      };
    }
  | {
      ok: false;
      error:
        | "validation"
        | "unauthenticated"
        | "forbidden"
        | "no_artist_workspace"
        | "unsupported_file"
        | "db";
      message?: string;
    };

async function resolveArtistWorkspace(
  userId: string,
  artistWorkspaceId?: string,
): Promise<
  | { ok: true; workspaceId: string }
  | { ok: false; error: "forbidden" | "no_artist_workspace" | "db"; message?: string }
> {
  const supabase = await createSupabaseServer();
  const studio = await getStudioContext();
  const isAdmin = studio.ok;

  if (artistWorkspaceId && isAdmin) {
    const { data: profile, error } = await (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- workspaces.kind generated type may lag
      supabase as any
    )
      .from("artist_profile")
      .select("workspace_id, workspace:workspaces(id, kind)")
      .eq("workspace_id", artistWorkspaceId)
      .maybeSingle();
    if (error) return { ok: false, error: "db", message: error.message };
    if (!profile || profile.workspace?.kind !== "artist") {
      return { ok: false, error: "no_artist_workspace" };
    }
    return { ok: true, workspaceId: artistWorkspaceId };
  }

  const active = await resolveActiveWorkspace(userId);
  if (!active || active.kind !== "artist") {
    return { ok: false, error: "no_artist_workspace" };
  }

  if (artistWorkspaceId && artistWorkspaceId !== active.id) {
    return { ok: false, error: "forbidden" };
  }

  const { data: isArtistMember, error: artistMemberErr } = await (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC generated after migration
    supabase as any
  ).rpc("is_artist_workspace_member", {
    uid: userId,
    wsid: active.id,
  });
  if (artistMemberErr) {
    return { ok: false, error: "db", message: artistMemberErr.message };
  }
  if (isArtistMember !== true) {
    return { ok: false, error: "no_artist_workspace" };
  }

  return { ok: true, workspaceId: active.id };
}

async function getUser() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return { supabase, user: null };
  return { supabase, user };
}

async function assertPersonaInWorkspace(
  supabase: Awaited<ReturnType<typeof createSupabaseServer>>,
  personaId: string,
  workspaceId: string,
) {
  const { data, error } = await (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- twin_personas type generated after migration
    supabase as any
  )
    .from("twin_personas")
    .select("id, artist_workspace_id")
    .eq("id", personaId)
    .eq("artist_workspace_id", workspaceId)
    .maybeSingle();

  if (error) return { ok: false as const, error: "db" as const, message: error.message };
  if (!data) return { ok: false as const, error: "forbidden" as const };
  return { ok: true as const };
}

function inferAssetType(contentType: string) {
  if (contentType.startsWith("image/")) return "image";
  if (contentType.startsWith("video/")) return "video";
  if (contentType.startsWith("audio/")) return "audio";
  if (
    contentType === "application/octet-stream" ||
    contentType === "application/pdf" ||
    contentType === "application/zip"
  ) {
    return "other";
  }
  return null;
}

function extensionFor(fileName: string, contentType: string) {
  const clean = fileName.toLowerCase().split(/[?#]/)[0] ?? "";
  const match = clean.match(/\.([a-z0-9]{1,10})$/);
  if (match) return match[1];
  if (contentType === "image/jpeg") return "jpg";
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  if (contentType === "video/mp4") return "mp4";
  if (contentType === "audio/mpeg") return "mp3";
  if (contentType === "audio/wav") return "wav";
  if (contentType === "application/pdf") return "pdf";
  if (contentType === "application/zip") return "zip";
  return "bin";
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isIssuedTwinAssetPath(
  storagePath: string,
  workspaceId: string,
  personaId: string,
  userId: string,
) {
  const pattern = new RegExp(
    `^twin-personas/${escapeRegExp(workspaceId)}/${escapeRegExp(
      personaId,
    )}/${escapeRegExp(userId)}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.[a-z0-9]{1,10}$`,
  );
  return pattern.test(storagePath);
}

async function verifyTwinAssetObject(storagePath: string) {
  const client = getR2Client();
  const head = await client.send(
    new HeadObjectCommand({
      Bucket: BRIEF_BUCKET,
      Key: storagePath,
    }),
  );

  if ((head.ContentLength ?? 0) > MAX_TWIN_ASSET_BYTES) {
    await client.send(
      new DeleteObjectCommand({
        Bucket: BRIEF_BUCKET,
        Key: storagePath,
      }),
    );
    return false;
  }

  const actualType = head.ContentType ? inferAssetType(head.ContentType) : null;
  return actualType;
}

export async function listMyPersonas(
  input: unknown = {},
): Promise<TwinPersonaActionResult> {
  const parsed = artistWorkspaceInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", message: parsed.error.message };
  }

  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  const workspace = await resolveArtistWorkspace(
    user.id,
    parsed.data.artistWorkspaceId,
  );
  if (!workspace.ok) return workspace;

  const { data, error } = await (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- twin_personas type generated after migration
    supabase as any
  )
    .from("twin_personas")
    .select(
      "id, artist_workspace_id, name, persona_type, description, status, min_fee, min_fee_public, cover_asset_path, created_at, updated_at",
    )
    .eq("artist_workspace_id", workspace.workspaceId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[listMyPersonas] query error:", error);
    return { ok: false, error: "db", message: error.message };
  }

  return { ok: true, personas: (data ?? []) as TwinPersona[] };
}

export async function listMyPersonaAssets(
  input: unknown = {},
): Promise<TwinPersonaActionResult> {
  const parsed = listAssetsInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", message: parsed.error.message };
  }

  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  const workspace = await resolveArtistWorkspace(
    user.id,
    parsed.data.artistWorkspaceId,
  );
  if (!workspace.ok) return workspace;

  const personaQuery = await (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- twin_personas type generated after migration
    supabase as any
  )
    .from("twin_personas")
    .select("id")
    .eq("artist_workspace_id", workspace.workspaceId);

  if (personaQuery.error) {
    return { ok: false, error: "db", message: personaQuery.error.message };
  }

  const personaIds = (personaQuery.data ?? []).map((row: { id: string }) => row.id);
  if (parsed.data.personaId && !personaIds.includes(parsed.data.personaId)) {
    return { ok: false, error: "forbidden" };
  }

  const targetPersonaIds = parsed.data.personaId
    ? [parsed.data.personaId]
    : personaIds;
  if (targetPersonaIds.length === 0) return { ok: true, assets: [] };

  const { data, error } = await (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- twin_persona_assets type generated after migration
    supabase as any
  )
    .from("twin_persona_assets")
    .select("id, persona_id, asset_type, storage_path, file_name, note, uploaded_by, created_at")
    .in("persona_id", targetPersonaIds)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[listMyPersonaAssets] query error:", error);
    return { ok: false, error: "db", message: error.message };
  }

  return { ok: true, assets: (data ?? []) as TwinPersonaAsset[] };
}

export async function createPersona(
  input: unknown,
): Promise<TwinPersonaActionResult> {
  const parsed = createPersonaInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", message: parsed.error.message };
  }

  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  const workspace = await resolveArtistWorkspace(
    user.id,
    parsed.data.artistWorkspaceId,
  );
  if (!workspace.ok) return workspace;

  const { data, error } = await (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- twin_personas type generated after migration
    supabase as any
  )
    .from("twin_personas")
    .insert({
      artist_workspace_id: workspace.workspaceId,
      name: parsed.data.name,
      persona_type: parsed.data.personaType,
      description: parsed.data.description,
      min_fee: parsed.data.minFee ?? null,
      min_fee_public: parsed.data.minFeePublic ?? false,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[createPersona] insert error:", error);
    return { ok: false, error: "db", message: error?.message };
  }

  revalidatePath("/[locale]/app/twins", "page");
  return { ok: true, personaId: data.id as string };
}

export async function updatePersona(
  input: unknown,
): Promise<TwinPersonaActionResult> {
  const parsed = updatePersonaInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", message: parsed.error.message };
  }

  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  const workspace = await resolveArtistWorkspace(
    user.id,
    parsed.data.artistWorkspaceId,
  );
  if (!workspace.ok) return workspace;

  const { error } = await (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- twin_personas type generated after migration
    supabase as any
  )
    .from("twin_personas")
    .update({
      name: parsed.data.name,
      persona_type: parsed.data.personaType,
      description: parsed.data.description,
    })
    .eq("id", parsed.data.personaId)
    .eq("artist_workspace_id", workspace.workspaceId);

  if (error) {
    console.error("[updatePersona] update error:", error);
    return { ok: false, error: "db", message: error.message };
  }

  revalidatePath("/[locale]/app/twins", "page");
  return { ok: true, personaId: parsed.data.personaId };
}

export async function updatePersonaStatus(
  input: unknown,
): Promise<TwinPersonaActionResult> {
  const parsed = updateStatusInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", message: parsed.error.message };
  }

  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  const workspace = await resolveArtistWorkspace(
    user.id,
    parsed.data.artistWorkspaceId,
  );
  if (!workspace.ok) return workspace;

  const { error } = await (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- twin_personas type generated after migration
    supabase as any
  )
    .from("twin_personas")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.personaId)
    .eq("artist_workspace_id", workspace.workspaceId);

  if (error) {
    console.error("[updatePersonaStatus] update error:", error);
    return { ok: false, error: "db", message: error.message };
  }

  revalidatePath("/[locale]/app/twins", "page");
  return { ok: true, personaId: parsed.data.personaId };
}

export async function updatePersonaFee(
  input: unknown,
): Promise<TwinPersonaActionResult> {
  const parsed = updateFeeInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", message: parsed.error.message };
  }

  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  const workspace = await resolveArtistWorkspace(
    user.id,
    parsed.data.artistWorkspaceId,
  );
  if (!workspace.ok) return workspace;

  const { error } = await (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- twin_personas type generated after migration
    supabase as any
  )
    .from("twin_personas")
    .update({
      min_fee: parsed.data.minFee ?? null,
      min_fee_public: parsed.data.minFeePublic,
    })
    .eq("id", parsed.data.personaId)
    .eq("artist_workspace_id", workspace.workspaceId);

  if (error) {
    console.error("[updatePersonaFee] update error:", error);
    return { ok: false, error: "db", message: error.message };
  }

  revalidatePath("/[locale]/app/twins", "page");
  return { ok: true, personaId: parsed.data.personaId };
}

export async function deletePersona(
  input: unknown,
): Promise<TwinPersonaActionResult> {
  const parsed = deletePersonaInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", message: parsed.error.message };
  }

  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  const workspace = await resolveArtistWorkspace(
    user.id,
    parsed.data.artistWorkspaceId,
  );
  if (!workspace.ok) return workspace;

  const { error } = await (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- twin_personas type generated after migration
    supabase as any
  )
    .from("twin_personas")
    .delete()
    .eq("id", parsed.data.personaId)
    .eq("artist_workspace_id", workspace.workspaceId);

  if (error) {
    console.error("[deletePersona] delete error:", error);
    return { ok: false, error: "db", message: error.message };
  }

  revalidatePath("/[locale]/app/twins", "page");
  return { ok: true, personaId: parsed.data.personaId };
}

export async function getTwinPersonaAssetUploadPutUrlAction(
  input: unknown,
): Promise<TwinPersonaActionResult> {
  const parsed = assetUploadInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", message: parsed.error.message };
  }

  const assetType = inferAssetType(parsed.data.contentType);
  if (!assetType) return { ok: false, error: "unsupported_file" };

  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  const workspace = await resolveArtistWorkspace(
    user.id,
    parsed.data.artistWorkspaceId,
  );
  if (!workspace.ok) return workspace;

  const persona = await assertPersonaInWorkspace(
    supabase,
    parsed.data.personaId,
    workspace.workspaceId,
  );
  if (!persona.ok) return persona;

  const ext = extensionFor(parsed.data.fileName, parsed.data.contentType);
  const storagePath = [
    "twin-personas",
    workspace.workspaceId,
    parsed.data.personaId,
    user.id,
    `${randomUUID()}.${ext}`,
  ].join("/");

  try {
    const putUrl = await createBriefAssetPutUrl(
      storagePath,
      parsed.data.contentType,
      900,
    );
    return { ok: true, upload: { putUrl, storagePath, assetType } };
  } catch (error) {
    console.error("[getTwinPersonaAssetUploadPutUrlAction] presign error:", error);
    return { ok: false, error: "db" };
  }
}

export async function createTwinPersonaAssetAction(
  input: unknown,
): Promise<TwinPersonaActionResult> {
  const parsed = createAssetInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", message: parsed.error.message };
  }

  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  const workspace = await resolveArtistWorkspace(
    user.id,
    parsed.data.artistWorkspaceId,
  );
  if (!workspace.ok) return workspace;

  const persona = await assertPersonaInWorkspace(
    supabase,
    parsed.data.personaId,
    workspace.workspaceId,
  );
  if (!persona.ok) return persona;

  if (
    !isIssuedTwinAssetPath(
      parsed.data.storagePath,
      workspace.workspaceId,
      parsed.data.personaId,
      user.id,
    )
  ) {
    return { ok: false, error: "forbidden" };
  }

  try {
    const assetType = await verifyTwinAssetObject(parsed.data.storagePath);
    if (!assetType) return { ok: false, error: "validation" };

    const sbAdmin = createSupabaseService();
    const { data, error } = await (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- twin_persona_assets type generated after migration
      sbAdmin as any
    )
      .from("twin_persona_assets")
      .insert({
        persona_id: parsed.data.personaId,
        asset_type: assetType,
        storage_path: parsed.data.storagePath,
        file_name: parsed.data.fileName,
        note: parsed.data.note,
        uploaded_by: user.id,
      })
      .select("id")
      .single();

    if (error || !data) {
      console.error("[createTwinPersonaAssetAction] insert error:", error);
      return { ok: false, error: "db", message: error?.message };
    }

    revalidatePath("/[locale]/app/twins", "page");
    return { ok: true, assetId: data.id as string };
  } catch (error) {
    console.error("[createTwinPersonaAssetAction] object verification error:", error);
    return { ok: false, error: "db" };
  }
}

export async function deleteTwinPersonaAssetAction(
  input: unknown,
): Promise<TwinPersonaActionResult> {
  const parsed = deleteAssetInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", message: parsed.error.message };
  }

  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  const workspace = await resolveArtistWorkspace(
    user.id,
    parsed.data.artistWorkspaceId,
  );
  if (!workspace.ok) return workspace;

  const persona = await assertPersonaInWorkspace(
    supabase,
    parsed.data.personaId,
    workspace.workspaceId,
  );
  if (!persona.ok) return persona;

  const { error } = await (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- twin_persona_assets type generated after migration
    supabase as any
  )
    .from("twin_persona_assets")
    .delete()
    .eq("id", parsed.data.assetId)
    .eq("persona_id", parsed.data.personaId);

  if (error) {
    console.error("[deleteTwinPersonaAssetAction] delete error:", error);
    return { ok: false, error: "db", message: error.message };
  }

  revalidatePath("/[locale]/app/twins", "page");
  return { ok: true, assetId: parsed.data.assetId };
}
