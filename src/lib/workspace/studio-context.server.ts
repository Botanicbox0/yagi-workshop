import { createSupabaseServer } from "@/lib/supabase/server";
import { getIsYagiAdmin } from "@/lib/app/admin";
import { resolveActiveWorkspace } from "@/lib/workspace/active";
import { isStudioContext } from "@/lib/workspace/studio-context";

export type StudioContextResult =
  | {
      ok: true;
      supabase: Awaited<ReturnType<typeof createSupabaseServer>>;
      userId: string;
      activeWorkspaceKind: "yagi_admin";
    }
  | {
      ok: false;
      supabase: Awaited<ReturnType<typeof createSupabaseServer>>;
      error: "unauthenticated" | "forbidden";
    };

export async function getStudioContext(): Promise<StudioContextResult> {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, supabase, error: "unauthenticated" };
  }

  const [activeWorkspace, isYagiAdmin] = await Promise.all([
    resolveActiveWorkspace(user.id),
    getIsYagiAdmin(supabase, user.id),
  ]);

  if (!isStudioContext(activeWorkspace, isYagiAdmin)) {
    return { ok: false, supabase, error: "forbidden" };
  }

  return {
    ok: true,
    supabase,
    userId: user.id,
    activeWorkspaceKind: "yagi_admin",
  };
}
