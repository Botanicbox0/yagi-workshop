"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";
import { isValidTransition } from "@/lib/challenges/state-machine";
import type { ChallengeState, SubmissionRequirements, JudgingConfig } from "@/lib/challenges/types";
import type { Json, Database } from "@/lib/supabase/database.types";

type ChallengeUpdate = Database["public"]["Tables"]["challenges"]["Update"];

const SLUG_RE = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;

type CreateInput = {
  slug: string;
  title: string;
  description_md?: string;
  hero_media_url?: string;
  open_at?: string;
  close_at?: string;
  announce_at?: string;
  submission_requirements: SubmissionRequirements;
  judging_config: JudgingConfig;
};

type UpdateInput = {
  slug?: string;
  title?: string;
  description_md?: string | null;
  hero_media_url?: string | null;
  open_at?: string | null;
  close_at?: string | null;
  announce_at?: string | null;
  submission_requirements?: SubmissionRequirements;
  judging_config?: JudgingConfig;
};

function revalidateChallenges(slug?: string) {
  for (const locale of ["ko", "en"]) {
    revalidatePath(`/${locale}/app/admin/challenges`);
    if (slug) revalidatePath(`/${locale}/app/admin/challenges/${slug}/edit`);
  }
}

async function getAuthenticatedAdmin() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, ok: false as const, error: "unauthorized" as const };
  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", { uid: user.id });
  if (!isAdmin) return { supabase, user, ok: false as const, error: "not_admin" as const };
  return { supabase, user, ok: true as const };
}

export async function createChallengeAction(
  input: CreateInput,
): Promise<{ ok: true; slug: string } | { ok: false; error: string }> {
  const auth = await getAuthenticatedAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  const slug = input.slug.trim().toLowerCase();
  if (!slug || slug.length < 3 || slug.length > 50 || !SLUG_RE.test(slug)) {
    return { ok: false, error: "invalid_slug" };
  }
  if (!input.title || input.title.trim().length === 0) {
    return { ok: false, error: "title_required" };
  }

  const { supabase, user } = auth;
  const { error } = await supabase.from("challenges").insert({
    slug,
    title: input.title.trim(),
    description_md: input.description_md ?? null,
    hero_media_url: input.hero_media_url ?? null,
    open_at: input.open_at ?? null,
    close_at: input.close_at ?? null,
    announce_at: input.announce_at ?? null,
    submission_requirements: input.submission_requirements as unknown as Json,
    judging_config: input.judging_config as unknown as Json,
    created_by: user.id,
  });

  if (error) {
    if (error.code === "23505") return { ok: false, error: "slug_taken" };
    console.error("[challenges] createChallengeAction", error.message);
    return { ok: false, error: "insert_failed" };
  }

  revalidateChallenges(slug);
  return { ok: true, slug };
}

export async function updateChallengeAction(
  currentSlug: string,
  patch: UpdateInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await getAuthenticatedAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  const { supabase } = auth;

  const { data: challenge, error: fetchErr } = await supabase
    .from("challenges")
    .select("state")
    .eq("slug", currentSlug)
    .maybeSingle();

  if (fetchErr || !challenge) return { ok: false, error: "not_found" };

  if (patch.slug !== undefined && patch.slug !== currentSlug && challenge.state !== "draft") {
    return { ok: false, error: "slug_locked" };
  }

  if (patch.slug !== undefined) {
    const newSlug = patch.slug.trim().toLowerCase();
    if (!newSlug || newSlug.length < 3 || newSlug.length > 50 || !SLUG_RE.test(newSlug)) {
      return { ok: false, error: "invalid_slug" };
    }
    patch = { ...patch, slug: newSlug };
  }

  const update: ChallengeUpdate = {};
  if (patch.slug !== undefined) update.slug = patch.slug;
  if (patch.title !== undefined) update.title = patch.title;
  if (patch.description_md !== undefined) update.description_md = patch.description_md;
  if (patch.hero_media_url !== undefined) update.hero_media_url = patch.hero_media_url;
  if (patch.open_at !== undefined) update.open_at = patch.open_at;
  if (patch.close_at !== undefined) update.close_at = patch.close_at;
  if (patch.announce_at !== undefined) update.announce_at = patch.announce_at;
  if (patch.submission_requirements !== undefined) {
    update.submission_requirements = patch.submission_requirements as unknown as Json;
  }
  if (patch.judging_config !== undefined) {
    update.judging_config = patch.judging_config as unknown as Json;
  }

  if (Object.keys(update).length === 0) return { ok: true };

  const { error } = await supabase
    .from("challenges")
    .update(update)
    .eq("slug", currentSlug);

  if (error) {
    if (error.code === "23505") return { ok: false, error: "slug_taken" };
    console.error("[challenges] updateChallengeAction", error.message);
    return { ok: false, error: "update_failed" };
  }

  const finalSlug = (patch.slug as string | undefined) ?? currentSlug;
  revalidateChallenges(finalSlug);
  return { ok: true };
}

export async function transitionChallengeStateAction(
  slug: string,
  to: ChallengeState,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await getAuthenticatedAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  const { supabase } = auth;

  const { data: challenge, error: fetchErr } = await supabase
    .from("challenges")
    .select("state")
    .eq("slug", slug)
    .maybeSingle();

  if (fetchErr || !challenge) return { ok: false, error: "not_found" };

  const from = challenge.state as ChallengeState;

  // closed_judging→closed_announced and closed_announced→archived go through B3's announce action
  if (to === "closed_announced" || to === "archived") {
    return { ok: false, error: "use_announce_action" };
  }

  if (!isValidTransition(from, to)) {
    return { ok: false, error: "invalid_transition" };
  }

  const { error } = await supabase
    .from("challenges")
    .update({ state: to })
    .eq("slug", slug);

  if (error) {
    console.error("[challenges] transitionChallengeStateAction", error.message);
    return { ok: false, error: "update_failed" };
  }

  revalidateChallenges(slug);
  return { ok: true };
}
