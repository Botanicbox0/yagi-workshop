// Handle validation — Phase 2.5 G2.
// Source: G2 Entry Decision Package §C (2026-04-23).
// Policy: lowercase ASCII + digits + underscore, start with letter,
// end with letter/digit, no double underscores, 3-30 chars, not reserved.

import { isReservedHandle } from "./reserved";

export const HANDLE_MIN_LENGTH = 3;
export const HANDLE_MAX_LENGTH = 30;

// Permitted: lowercase ASCII letters, digits, underscore.
// Must start with a letter (not digit, not underscore).
// Must end with a letter or digit (not underscore).
// No consecutive underscores.
export const HANDLE_REGEX = /^[a-z][a-z0-9_]{1,28}[a-z0-9]$|^[a-z][a-z0-9]$/;

// Why two alternatives in the regex:
// - 3-30 chars normal case: starts a-z, middle a-z/0-9/_, ends a-z/0-9
// - 2-char edge case: rejected by length floor (HANDLE_MIN_LENGTH=3)
// - For 3-char: starts a-z, then 1 char from a-z0-9_, ends a-z/0-9
//   → `[a-z][a-z0-9_][a-z0-9]` covered by first alternative.
//
// Decision: minimum is 3. 2-char handles are too rare/scarce for Korean
// market (most users prefer 4-12).

export type HandleValidationError =
  | "TOO_SHORT"
  | "TOO_LONG"
  | "INVALID_CHARS"
  | "INVALID_START"
  | "INVALID_END"
  | "CONSECUTIVE_UNDERSCORE"
  | "RESERVED";

export function validateHandle(handle: string): HandleValidationError | null {
  const trimmed = handle.trim().toLowerCase();

  if (trimmed.length < HANDLE_MIN_LENGTH) return "TOO_SHORT";
  if (trimmed.length > HANDLE_MAX_LENGTH) return "TOO_LONG";

  // Character allowlist: a-z, 0-9, underscore only.
  if (!/^[a-z0-9_]+$/.test(trimmed)) return "INVALID_CHARS";

  // Start: must be a letter.
  if (!/^[a-z]/.test(trimmed)) return "INVALID_START";

  // End: must be a letter or digit (not underscore).
  if (!/[a-z0-9]$/.test(trimmed)) return "INVALID_END";

  // No double underscores.
  if (/__/.test(trimmed)) return "CONSECUTIVE_UNDERSCORE";

  // Reserved list.
  if (isReservedHandle(trimmed)) return "RESERVED";

  return null;
}
