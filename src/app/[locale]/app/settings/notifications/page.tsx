import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import { createSupabaseServer } from "@/lib/supabase/server";
import { PrefsForm } from "./prefs-form";
import { TIMEZONES, type Timezone } from "@/lib/notifications/timezones";

// Schema defaults mirror the migration so new users see the right values even
// without a notification_preferences row yet.
const DEFAULTS = {
  email_immediate_enabled: true,
  email_digest_enabled: true,
  digest_time_local: "09:00",
  quiet_hours_start: "22:00",
  quiet_hours_end: "08:00",
  timezone: "Asia/Seoul",
} as const satisfies { timezone: Timezone } & Record<string, unknown>;

// The DB `time` column comes back as "HH:MM:SS"; trim to HH:MM for <input type="time">.
function toHHMM(v: string | null | undefined, fallback: string): string {
  if (!v) return fallback;
  return v.slice(0, 5);
}

// Coerce a DB-stored timezone back to the allowlist. Legacy rows predating
// Phase 2.0 G4 #3 may hold arbitrary IANA strings — fall back to the default
// rather than crash the form.
function toAllowedTimezone(v: string | null | undefined): Timezone {
  if (v && (TIMEZONES as readonly string[]).includes(v)) {
    return v as Timezone;
  }
  return DEFAULTS.timezone;
}

export default async function NotificationPreferencesPage() {
  const locale = await getLocale();
  const t = await getTranslations("notifications");

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect({ href: "/signin", locale });

  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select(
      "email_immediate_enabled, email_digest_enabled, digest_time_local, quiet_hours_start, quiet_hours_end, timezone",
    )
    .eq("user_id", user!.id)
    .maybeSingle();

  const defaultValues = {
    email_immediate_enabled:
      prefs?.email_immediate_enabled ?? DEFAULTS.email_immediate_enabled,
    email_digest_enabled:
      prefs?.email_digest_enabled ?? DEFAULTS.email_digest_enabled,
    digest_time_local: toHHMM(
      prefs?.digest_time_local,
      DEFAULTS.digest_time_local,
    ),
    quiet_hours_start: toHHMM(
      prefs?.quiet_hours_start,
      DEFAULTS.quiet_hours_start,
    ),
    quiet_hours_end: toHHMM(prefs?.quiet_hours_end, DEFAULTS.quiet_hours_end),
    timezone: toAllowedTimezone(prefs?.timezone),
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-xl font-serif italic keep-all">
          {t("prefs_page_title")}
        </h2>
        <p className="text-sm text-muted-foreground keep-all">
          {t("prefs_page_intro")}
        </p>
      </div>
      <PrefsForm defaultValues={defaultValues} />
    </div>
  );
}
