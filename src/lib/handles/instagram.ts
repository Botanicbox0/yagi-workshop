// Instagram handle validation — Phase 2.5 G2.
// Source: G2 Entry Decision Package §D (2026-04-23).
// Meta documented rules: 1-30 chars, letters/numbers/underscore/period,
// no consecutive periods, no leading/trailing period, case-insensitive.

export const INSTAGRAM_HANDLE_REGEX =
  /^(?!.*\.\.)(?!.*\.$)(?!\.)[a-zA-Z0-9._]{1,30}$/;

export type InstagramValidationError =
  | "EMPTY"
  | "TOO_LONG"
  | "INVALID_CHARS"
  | "CONSECUTIVE_DOTS"
  | "STARTS_OR_ENDS_WITH_DOT";

export function validateInstagramHandle(input: string): {
  valid: boolean;
  error: InstagramValidationError | null;
  canonical: string;  // stripped + lowercased version for storage
} {
  const trimmed = input.trim().replace(/^@/, "");  // accept "@yagi" or "yagi"
  if (trimmed.length === 0) return { valid: false, error: "EMPTY", canonical: "" };
  if (trimmed.length > 30) return { valid: false, error: "TOO_LONG", canonical: trimmed };
  if (!/^[a-zA-Z0-9._]+$/.test(trimmed))
    return { valid: false, error: "INVALID_CHARS", canonical: trimmed };
  if (/\.\./.test(trimmed))
    return { valid: false, error: "CONSECUTIVE_DOTS", canonical: trimmed };
  if (/^\./.test(trimmed) || /\.$/.test(trimmed))
    return { valid: false, error: "STARTS_OR_ENDS_WITH_DOT", canonical: trimmed };

  return { valid: true, error: null, canonical: trimmed.toLowerCase() };
}
