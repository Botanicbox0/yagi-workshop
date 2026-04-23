import { createSupabaseServer } from "@/lib/supabase/server";
import type { ProfileRole } from "@/lib/app/context";

export type ProfileWithSubmissions = {
  profile: {
    id: string;
    handle: string;
    display_name: string;
    role: ProfileRole | null;
    bio: string | null;
    avatar_url: string | null;
    instagram_handle: string | null;
    handle_changed_at: string | null;
  };
  submissions: Array<{
    id: string;
    challenge_id: string;
    content: Record<string, unknown>;
    created_at: string;
    status: string;
    challenge: { slug: string; title: string; state: string };
  }>;
} | null;

export async function getProfileByHandle(
  handle: string,
): Promise<ProfileWithSubmissions> {
  const supabase = await createSupabaseServer();

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, handle, display_name, role, bio, avatar_url, instagram_handle, handle_changed_at",
    )
    .eq("handle", handle)
    .maybeSingle();

  if (!profile) return null;

  const { data: submissions } = await supabase
    .from("challenge_submissions")
    .select(
      `id, challenge_id, content, created_at, status,
       challenge:challenges!inner(slug, title, state)`,
    )
    .eq("submitter_id", profile.id)
    .eq("status", "ready")
    .neq("challenge.state", "draft")
    .order("created_at", { ascending: false });

  return {
    profile: {
      id: profile.id,
      handle: profile.handle,
      display_name: profile.display_name,
      role: (profile.role as ProfileRole | null) ?? null,
      bio: profile.bio ?? null,
      avatar_url: profile.avatar_url ?? null,
      instagram_handle: profile.instagram_handle ?? null,
      handle_changed_at: profile.handle_changed_at ?? null,
    },
    submissions: (submissions ?? []).map((s) => {
      const ch = Array.isArray(s.challenge) ? s.challenge[0] : s.challenge;
      return {
        id: s.id,
        challenge_id: s.challenge_id,
        content: (s.content ?? {}) as Record<string, unknown>,
        created_at: s.created_at,
        status: s.status,
        challenge: ch as { slug: string; title: string; state: string },
      };
    }),
  };
}
