/**
 * formatKoreanDateTime — shared bilingual (KO/EN) datetime formatter.
 *
 * Phase 5 Wave C HF1.5 — date format helper.
 *
 * KO output : "2026년 5월 21일 오전 12:32"
 * EN output : "May 21, 2026 12:32 AM"
 *
 * Rules:
 * - Uses Intl.DateTimeFormat with hour12: true, hourCycle: 'h12'.
 * - KO: builds date string via Intl.format() to preserve "년"/"월"/"일" literals.
 *   Uses formatToParts for time to extract dayPeriod, then normalises to 오전/오후.
 * - EN: uses formatToParts for both date and time, assembles "May 21, 2026 12:32 AM".
 * - Timezone: browser/system local (no explicit tz override per spec).
 * - Edge cases: noon (12:00 PM → KO "오후 12:00"), midnight (12:00 AM → KO "오전 12:00").
 */

/** Normalize an input that may already be a Date or an ISO string. */
function toDate(date: Date | string): Date {
  return typeof date === "string" ? new Date(date) : date;
}

/**
 * formatKoreanDateTime
 *
 * @param date  - Date object or ISO-8601 string
 * @param locale - 'ko' for Korean, 'en' for English
 * @returns Formatted datetime string
 *
 * @example
 * formatKoreanDateTime(new Date("2026-05-21T00:32:00"), "ko") // "2026년 5월 21일 오전 12:32"
 * formatKoreanDateTime(new Date("2026-05-21T00:32:00"), "en") // "May 21, 2026 12:32 AM"
 */
export function formatKoreanDateTime(
  date: Date | string,
  locale: "ko" | "en"
): string {
  const d = toDate(date);
  if (Number.isNaN(d.getTime())) {
    return typeof date === "string" ? date : "";
  }

  if (locale === "ko") {
    return _formatKo(d);
  }
  return _formatEn(d);
}

/**
 * formatKoreanDate — date-only variant (no time).
 *
 * KO output : "2026년 5월 21일"
 * EN output : "May 21, 2026"
 */
export function formatKoreanDate(
  date: Date | string,
  locale: "ko" | "en"
): string {
  const d = toDate(date);
  if (Number.isNaN(d.getTime())) {
    return typeof date === "string" ? date : "";
  }

  const intlLocale = locale === "ko" ? "ko-KR" : "en-US";
  return new Intl.DateTimeFormat(intlLocale, {
    year: "numeric",
    month: locale === "ko" ? "long" : "short",
    day: "numeric",
  }).format(d);
}

// ---------------------------------------------------------------------------
// Internal formatters
// ---------------------------------------------------------------------------

function _formatKo(d: Date): string {
  // Use Intl.format() for the date portion — this preserves "년"/"월"/"일"
  // literals that appear as separate "literal" parts in formatToParts().
  // e.g., "2026년 5월 21일" — correct spec output.
  const dateStr = new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d);

  // Use formatToParts for the time portion to robustly extract dayPeriod.
  const timeParts = new Intl.DateTimeFormat("ko-KR", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    hourCycle: "h12",
  }).formatToParts(d);

  const rawDayPeriod = _getPart(timeParts, "dayPeriod");
  const hourRaw = _getPart(timeParts, "hour");
  const minute = _getPart(timeParts, "minute");

  // Normalize to 오전/오후 regardless of what Intl returns.
  // Node may return "AM"/"PM", "오전"/"오후", "am"/"pm", etc.
  const ampm = _normalizeDayPeriod(rawDayPeriod, d);

  // "오전 12:32" / "오후 3:45"
  const timeStr = `${ampm} ${hourRaw}:${minute}`;

  // Final: "2026년 5월 21일 오전 12:32"
  return `${dateStr} ${timeStr}`;
}

function _formatEn(d: Date): string {
  // Use formatToParts for date to extract month/day/year independently.
  const dateParts = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).formatToParts(d);

  // Use formatToParts for time to extract dayPeriod, hour, minute.
  const timeParts = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    hourCycle: "h12",
  }).formatToParts(d);

  const month = _getPart(dateParts, "month");
  const day = _getPart(dateParts, "day");
  const year = _getPart(dateParts, "year");

  const hourRaw = _getPart(timeParts, "hour");
  const minute = _getPart(timeParts, "minute");
  const rawDayPeriod = _getPart(timeParts, "dayPeriod");

  // Normalize to uppercase AM/PM
  const ampm = _normalizeDayPeriodEn(rawDayPeriod, d);

  // "May 21, 2026 12:32 AM"
  return `${month} ${day}, ${year} ${hourRaw}:${minute} ${ampm}`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function _getPart(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes
): string {
  return parts.find((p) => p.type === type)?.value ?? "";
}

/**
 * Normalize the dayPeriod for Korean output.
 * Returns "오전" or "오후" regardless of Intl locale output variance.
 * Falls back to hour-based check if Intl returns unexpected string.
 */
function _normalizeDayPeriod(raw: string, d: Date): "오전" | "오후" {
  const lower = raw.toLowerCase();
  if (
    lower === "am" ||
    lower === "오전" ||
    lower === "午前" ||
    lower.startsWith("오전")
  ) {
    return "오전";
  }
  if (
    lower === "pm" ||
    lower === "오후" ||
    lower === "午後" ||
    lower.startsWith("오후")
  ) {
    return "오후";
  }
  // Fallback: derive from hours
  return d.getHours() < 12 ? "오전" : "오후";
}

/**
 * Normalize the dayPeriod for English output.
 * Returns "AM" or "PM".
 */
function _normalizeDayPeriodEn(raw: string, d: Date): "AM" | "PM" {
  const lower = raw.toLowerCase();
  if (lower === "am" || lower === "오전" || lower.startsWith("오전")) {
    return "AM";
  }
  if (lower === "pm" || lower === "오후" || lower.startsWith("오후")) {
    return "PM";
  }
  // Fallback
  return d.getHours() < 12 ? "AM" : "PM";
}
