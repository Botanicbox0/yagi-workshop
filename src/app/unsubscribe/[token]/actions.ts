"use server";

// Phase 1.8 subtask 05 — confirm-unsubscribe Server Action.
//
// This runs with the service-role client because the user isn't necessarily
// signed in (the link is clicked from an email). The token itself is the
// secret — its table has RLS intentionally disabled per spec.

import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export async function confirmUnsubscribe(formData: FormData): Promise<void> {
  const token = formData.get("token");
  if (typeof token !== "string" || token.length === 0) {
    redirect("/unsubscribe/invalid");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("[unsubscribe/confirm] missing supabase env");
    redirect(`/unsubscribe/${token}?error=1`);
  }

  const admin = createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Re-verify the token is valid and unused.
  const { data: tokenRow, error: tokenErr } = await admin
    .from("notification_unsubscribe_tokens")
    .select("user_id, used_at")
    .eq("token", token)
    .maybeSingle();

  if (tokenErr) {
    console.error("[unsubscribe/confirm] token lookup failed:", tokenErr);
    redirect(`/unsubscribe/${token}?error=1`);
  }
  if (!tokenRow || tokenRow.used_at) {
    redirect(`/unsubscribe/${token}`);
  }

  const userId = tokenRow!.user_id;

  // Upsert preferences with both email toggles off.
  const { error: prefErr } = await admin
    .from("notification_preferences")
    .upsert(
      {
        user_id: userId,
        email_immediate_enabled: false,
        email_digest_enabled: false,
      },
      { onConflict: "user_id" },
    );
  if (prefErr) {
    console.error("[unsubscribe/confirm] prefs upsert failed:", prefErr);
    redirect(`/unsubscribe/${token}?error=1`);
  }

  // Mark the token used so it can't be replayed. The `used_at IS NULL` guard
  // makes this an atomic claim — a concurrent confirm whose UPDATE races with
  // ours affects 0 rows instead of silently consuming the token twice.
  // Phase 2.0 G4 #1 (Phase 1.8 M1).
  const { error: tokErr } = await admin
    .from("notification_unsubscribe_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("token", token)
    .is("used_at", null);
  if (tokErr) {
    console.error("[unsubscribe/confirm] token mark-used failed:", tokErr);
    // The preferences update did succeed, so we still show the success page.
  }

  redirect(`/unsubscribe/${token}?confirmed=1`);
}
