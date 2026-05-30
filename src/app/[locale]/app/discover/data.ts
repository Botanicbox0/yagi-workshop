import { createSupabaseServer } from "@/lib/supabase/server";

export type DiscoverablePersona = {
  id: string;
  name: string | null;
  persona_type: string | null;
  description: string | null;
  cover_asset_path: string | null;
  status: string;
  min_fee: number | null;
};

export function resolveCoverUrl(
  supabase: Awaited<ReturnType<typeof createSupabaseServer>>,
  path: string | null,
) {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (path.startsWith("/")) return path;
  return supabase.storage.from("portfolios").getPublicUrl(path).data.publicUrl;
}

export async function listDiscoverablePersonas(
  supabase: Awaited<ReturnType<typeof createSupabaseServer>>,
) {
  const { data, error } = await (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 9 RPC typegen pending
    supabase as any
  ).rpc("list_discoverable_personas");

  return {
    data: ((data ?? []) as DiscoverablePersona[]).map((persona) => ({
      ...persona,
      cover_asset_path: resolveCoverUrl(supabase, persona.cover_asset_path),
    })),
    error,
  };
}
