/**
 * Phase 4.x Wave C.5b sub_13 — Artist demo account bootstrap.
 *
 * Creates the test Artist account specified by yagi:
 *   email:    artist@yagiworkshop.xyz
 *   password: yagiworkshop12#$
 *   role:     'artist'
 *
 * Run via: `npx tsx scripts/create-artist-account.ts`
 *
 * BLOCKED until the `profiles_role_check` CHECK constraint is widened
 * to accept 'artist'. The current constraint is:
 *
 *   CHECK ((role IS NULL) OR
 *          (role = ANY (ARRAY['creator','studio','observer','client'])))
 *
 * Adding 'artist' is a Phase 5 entry deliverable (curated Artist
 * Roster intake, see DECISIONS_CACHE.md Q-094 + ARCHITECTURE.md §18.1).
 * Running this script *before* that migration lands will fail with
 * a check_violation.
 *
 * Required env vars (from `.env.local`):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const ARTIST_EMAIL = "artist@yagiworkshop.xyz";
const ARTIST_PASSWORD = "yagiworkshop12#$";
const ARTIST_DISPLAY_NAME = "Artist Demo";
const ARTIST_ROLE = "artist";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env",
    );
  }

  const supabase: SupabaseClient = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Create auth user
  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email: ARTIST_EMAIL,
    password: ARTIST_PASSWORD,
    email_confirm: true,
    user_metadata: { display_name: ARTIST_DISPLAY_NAME },
  });
  if (authErr) {
    if (authErr.message.includes("already registered") || authErr.message.includes("exists")) {
      console.warn(`[artist-account] auth user already exists, looking up id...`);
      const { data: usersList } = await supabase.auth.admin.listUsers();
      const existing = usersList?.users.find((u) => u.email === ARTIST_EMAIL);
      if (!existing) throw new Error("auth user reported existing but lookup failed");
      await ensureProfile(supabase, existing.id);
      console.log(`[artist-account] existing user_id=${existing.id} profile ensured`);
      return;
    }
    throw authErr;
  }

  const userId = authData.user?.id;
  if (!userId) throw new Error("auth.users insert returned no id");

  await ensureProfile(supabase, userId);
  console.log(`[artist-account] created user_id=${userId} role=${ARTIST_ROLE}`);
}

async function ensureProfile(supabase: SupabaseClient, userId: string) {
  // Generate a placeholder handle (internal-only, see DECISIONS Q-095).
  const handle = `artist_demo_${userId.slice(0, 6)}`;

  const { error: profileErr } = await supabase.from("profiles").upsert({
    id: userId,
    handle,
    display_name: ARTIST_DISPLAY_NAME,
    role: ARTIST_ROLE,
    locale: "ko",
  });
  if (profileErr) {
    if (profileErr.code === "23514" || profileErr.message.includes("profiles_role_check")) {
      throw new Error(
        `[artist-account] profiles_role_check rejected role='${ARTIST_ROLE}'. ` +
          `The CHECK constraint must be widened to include 'artist' (Phase 5 entry migration). ` +
          `See DECISIONS_CACHE.md Q-094.`,
      );
    }
    throw profileErr;
  }
}

main().catch((err) => {
  console.error("[artist-account] failed:", err);
  process.exit(1);
});
