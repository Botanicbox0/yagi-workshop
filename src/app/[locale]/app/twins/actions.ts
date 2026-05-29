"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServer } from "@/lib/supabase/server";
import { resolveActiveWorkspace } from "@/lib/workspace/active";

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

export type TwinPersonaActionResult =
  | { ok: true; personaId?: string; personas?: TwinPersona[] }
  | {
      ok: false;
      error:
        | "validation"
        | "unauthenticated"
        | "forbidden"
        | "no_artist_workspace"
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
  const { data: isAdmin, error: adminErr } = await supabase.rpc("is_yagi_admin", {
    uid: userId,
  });
  if (adminErr) return { ok: false, error: "db", message: adminErr.message };

  if (artistWorkspaceId && isAdmin === true) {
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
