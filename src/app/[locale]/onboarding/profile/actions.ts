"use server";

import { randomUUID } from "node:crypto";
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

// Phase 2.7 client onboarding. Clients have no public profile, so handle
// is auto-generated server-side (not exposed to the user) and we collect
// company info instead of personal handle/bio.
export type ClientOnboardingInput = {
  role: "client";
  locale: OnboardingLocale;
  company_name: string;
  company_type: "label" | "agency" | "studio" | "independent" | "other";
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  website_url: string | null;
  instagram_handle: string | null;
};

export type CompleteProfileInput =
  | CreatorInput
  | StudioInput
  | ObserverInput
  | ClientOnboardingInput;

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

  // Client signup uses a separate code path — no public handle, no
  // public profile, no creators/studios row. Company info goes into
  // the clients table.
  if (input.role === "client") {
    return completeClientProfile(supabase, user, input);
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
  if (role === "client") return "/app/commission/new";
  return `/u/${handle}`;
}

async function completeClientProfile(
  supabase: Awaited<ReturnType<typeof createSupabaseServer>>,
  user: { id: string; email?: string },
  input: ClientOnboardingInput
): Promise<CompleteProfileResult> {
  const company_name = input.company_name.trim();
  if (company_name.length === 0 || company_name.length > 120) {
    return { ok: false, error: "company_name:LENGTH" };
  }
  const contact_name = input.contact_name.trim();
  if (contact_name.length === 0 || contact_name.length > 60) {
    return { ok: false, error: "contact_name:LENGTH" };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.contact_email)) {
    return { ok: false, error: "contact_email:FORMAT" };
  }

  // Generate a unique handle for the client. Not user-facing (clients
  // have no public profile); needed only to satisfy profiles.handle
  // NOT NULL + UNIQUE. Format: c_<random8>. Retry once on rare collision.
  let handle = generateClientHandle();
  for (let attempt = 0; attempt < 3; attempt++) {
    const { error: profileErr } = await supabase.from("profiles").insert({
      id: user.id,
      handle,
      display_name: contact_name,
      bio: null,
      instagram_handle: null,
      locale: input.locale,
      role: "client",
    });
    if (!profileErr) break;
    if (profileErr.code === "23505" && attempt < 2) {
      handle = generateClientHandle();
      continue;
    }
    return { ok: false, error: `profile:${profileErr.message}` };
  }

  const { error: clientErr } = await supabase.from("clients").insert({
    id: user.id,
    company_name,
    company_type: input.company_type,
    contact_name,
    contact_email: input.contact_email.trim(),
    contact_phone: input.contact_phone?.trim() || null,
    website_url: input.website_url?.trim() || null,
    instagram_handle: input.instagram_handle?.trim() || null,
  });
  if (clientErr) return { ok: false, error: `client:${clientErr.message}` };

  // Skip the role-confirmation welcome email for clients — sendWelcomeEmail
  // is a Phase 2.5 creator/studio/observer template; client gets a tailored
  // notification path in G3 (admin response cycle).

  return {
    ok: true,
    redirect: "/app/commission/new",
  };
}

function generateClientHandle(): string {
  // 8-char hex from a random uuid. Collision space ~16M; retry on dup.
  const id = randomUUID().replace(/-/g, "").slice(0, 8);
  return `c_${id}`;
}
