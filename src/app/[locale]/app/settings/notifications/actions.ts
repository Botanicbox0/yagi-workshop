"use server";

// Phase 1.8 subtask 05 — notification preferences Server Action.

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";

// HH:MM (24h). Accepts HH:MM or HH:MM:SS from <input type="time">.
const timeRegex = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

const prefsSchema = z.object({
  email_immediate_enabled: z.boolean(),
  email_digest_enabled: z.boolean(),
  digest_time_local: z.string().regex(timeRegex),
  quiet_hours_start: z.string().regex(timeRegex),
  quiet_hours_end: z.string().regex(timeRegex),
  timezone: z.string().trim().min(1).max(64),
});

export type NotificationPrefsInput = z.infer<typeof prefsSchema>;

export async function updateNotificationPreferences(
  input: unknown,
): Promise<{ ok: true } | { error: string }> {
  const parsed = prefsSchema.safeParse(input);
  if (!parsed.success) return { error: "validation" };

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauthenticated" };

  // Normalize time values to HH:MM (the DB column is time; postgres accepts both).
  const toHHMM = (s: string) => s.slice(0, 5);

  const { error } = await supabase.from("notification_preferences").upsert(
    {
      user_id: user.id,
      email_immediate_enabled: parsed.data.email_immediate_enabled,
      email_digest_enabled: parsed.data.email_digest_enabled,
      digest_time_local: toHHMM(parsed.data.digest_time_local),
      quiet_hours_start: toHHMM(parsed.data.quiet_hours_start),
      quiet_hours_end: toHHMM(parsed.data.quiet_hours_end),
      timezone: parsed.data.timezone,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    console.error("[notif/updatePrefs] upsert failed:", error);
    return { error: "db" };
  }

  revalidatePath("/[locale]/app/settings/notifications", "page");
  return { ok: true };
}
