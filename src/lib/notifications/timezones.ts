// Phase 2.0 G4 #3 (Phase 1.8 M7) — shared IANA timezone allowlist. Used by
// both the server action schema that persists notification_preferences.timezone
// and the client-side preferences form's <select> options. A mismatch here
// silently breaks digest dispatch (cron resolves "now" in the user's tz), so
// keep this list as the single source of truth for both sides.

export const TIMEZONES = [
  "Asia/Seoul",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Singapore",
  "Asia/Bangkok",
  "Europe/London",
  "Europe/Paris",
  "America/New_York",
  "America/Los_Angeles",
  "UTC",
] as const;

export type Timezone = (typeof TIMEZONES)[number];
