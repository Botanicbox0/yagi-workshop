"use server";

import { createSupabaseServer } from "@/lib/supabase/server";
import { validateHandle } from "@/lib/handles/validate";
import { validateInstagramHandle } from "@/lib/handles/instagram";
import { sendWelcomeEmail } from "@/lib/email/send-onboarding";
import type { ProfileRole } from "@/lib/app/context";

type OnboardingLocale = "ko" | "en";

type BaseInput = {
  handle: string;
  instagram_handle: string | null;
  display_name: string;
  locale: OnboardingLocale;
};

type CreatorInput = BaseInput & {
  role: "creator";
  bio: string | null;
};

type StudioInput = BaseInput & {
  role: "studio";
  studio_name: string;
  contact_email: string;
  member_count: "1-5" | "6-10" | "11+";
};

type ObserverInput = BaseInput & {
  role: "observer";
};

export type CompleteProfileInput = CreatorInput | StudioInput | ObserverInput;

export type CompleteProfileResult =
  | { ok: true; redirect: string }
  | { ok: false; error: string };

export async function completeProfileAction(
  input: CompleteProfileInput
): Promise<CompleteProfileResult> {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not_authenticated" };

  // Prevent double-submit: if a profile already exists with a handle, treat
  // as idempotent complete — route to destination instead of insert-erroring.
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("handle, role")
    .eq("id", user.id)
    .maybeSingle();
  if (existingProfile && existingProfile.handle) {
    return {
      ok: true,
      redirect: resolveDestination(
        (existingProfile.role as ProfileRole | null) ?? input.role,
        existingProfile.handle
      ),
    };
  }

  const normalizedHandle = input.handle.trim().toLowerCase();
  const handleErr = validateHandle(normalizedHandle);
  if (handleErr) return { ok: false, error: `handle:${handleErr}` };

  let igCanonical: string | null = null;
  if (input.instagram_handle && input.instagram_handle.trim().length > 0) {
    const igRes = validateInstagramHandle(input.instagram_handle);
    if (!igRes.valid)
      return { ok: false, error: `instagram:${igRes.error ?? "INVALID"}` };
    igCanonical = igRes.canonical;
  }

  if (
    input.display_name.trim().length === 0 ||
    input.display_name.length > 80
  ) {
    return { ok: false, error: "display_name:LENGTH" };
  }

  // Note: is_handle_available RPC is introduced in migration
  // 20260424000000_phase_2_5_g2_handle_history.sql (applied at G2 commit).
  // Cast bypasses stale database.types.ts; types regenerate post-migration.
  const { data: availRaw, error: availErr } = await (supabase.rpc as unknown as (
    fn: "is_handle_available",
    args: { candidate: string }
  ) => Promise<{ data: boolean | null; error: { message: string } | null }>)(
    "is_handle_available",
    { candidate: normalizedHandle }
  );
  if (availErr) return { ok: false, error: `availability:${availErr.message}` };
  const available = Boolean(availRaw);
  if (!available) return { ok: false, error: "handle:TAKEN" };

  if (input.role === "creator") {
    if (input.bio && input.bio.length > 200) {
      return { ok: false, error: "bio:LENGTH" };
    }
  }
  if (input.role === "studio") {
    if (
      input.studio_name.trim().length === 0 ||
      input.studio_name.length > 80
    ) {
      return { ok: false, error: "studio_name:LENGTH" };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.contact_email)) {
      return { ok: false, error: "contact_email:FORMAT" };
    }
  }

  const { error: profileErr } = await supabase.from("profiles").insert({
    id: user.id,
    handle: normalizedHandle,
    display_name: input.display_name.trim(),
    bio: input.role === "creator" ? (input.bio?.trim() || null) : null,
    instagram_handle: igCanonical,
    locale: input.locale,
    role: input.role,
  });
  if (profileErr) {
    if (profileErr.code === "23505") {
      return { ok: false, error: "handle:TAKEN" };
    }
    return { ok: false, error: `profile:${profileErr.message}` };
  }

  if (input.role === "creator") {
    const { error: creatorErr } = await supabase.from("creators").insert({
      id: user.id,
      display_name: input.display_name.trim(),
    });
    if (creatorErr)
      return { ok: false, error: `creator:${creatorErr.message}` };
  } else if (input.role === "studio") {
    const { error: studioErr } = await supabase.from("studios").insert({
      id: user.id,
      studio_name: input.studio_name.trim(),
      contact_email: input.contact_email.trim(),
      member_count: input.member_count,
    });
    if (studioErr) return { ok: false, error: `studio:${studioErr.message}` };
  }

  // Fire-and-forget welcome email — do not block the redirect on email send.
  if (user.email) {
    void sendWelcomeEmail(user.email, {
      handle: normalizedHandle,
      display_name: input.display_name.trim(),
      role: input.role,
    });
  }

  return {
    ok: true,
    redirect: resolveDestination(input.role, normalizedHandle),
  };
}

function resolveDestination(role: ProfileRole, handle: string): string {
  if (role === "observer") return "/challenges";
  return `/u/${handle}`;
}
