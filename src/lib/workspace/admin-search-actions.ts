"use server";

import { createSupabaseServer } from "@/lib/supabase/server";
import type { WorkspaceKind } from "@/lib/workspace/active";

export type AdminWorkspaceSearchItem = {
  id: string;
  name: string;
  kind: WorkspaceKind;
  isTest: boolean;
};

export type AdminWorkspaceSearchResult =
  | { ok: true; workspaces: AdminWorkspaceSearchItem[] }
  | { ok: false; error: "unauthenticated" | "forbidden" | "db" };

function narrowKind(value: unknown): WorkspaceKind {
  if (
    value === "brand" ||
    value === "agency" ||
    value === "artist" ||
    value === "creator" ||
    value === "yagi_admin"
  ) {
    return value;
  }
  return "brand";
}

export async function listAdminWorkspaceSearchItems(): Promise<AdminWorkspaceSearchResult> {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  const { data: isAdmin, error: adminError } = await supabase.rpc(
    "is_yagi_admin",
    { uid: user.id },
  );
  if (adminError) {
    console.error("[workspaceSearch] admin check failed:", adminError);
    return { ok: false, error: "db" };
  }
  if (!isAdmin) return { ok: false, error: "forbidden" };

  // workspaces.kind is newer than generated types in some local snapshots.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- workspaces.kind type regen pending
  const sb = supabase as any;
  const { data, error } = (await sb
    .from("workspaces")
    .select("id, name, kind, is_test")
    .order("is_test", { ascending: true })
    .order("name", { ascending: true })
    .limit(200)) as {
    data:
      | {
          id: string;
          name: string;
          kind?: string;
          is_test?: boolean;
        }[]
      | null;
    error: unknown;
  };

  if (error) {
    console.error("[workspaceSearch] workspace query failed:", error);
    return { ok: false, error: "db" };
  }

  return {
    ok: true,
    workspaces: (data ?? []).map((workspace) => ({
      id: workspace.id,
      name: workspace.name,
      kind: narrowKind(workspace.kind),
      isTest: workspace.is_test === true,
    })),
  };
}
