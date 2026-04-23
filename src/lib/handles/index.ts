// Barrel export for handle validation utilities — Phase 2.5 G2.
// Source: G2 Entry Decision Package §G file inventory (2026-04-23).
// Consumers import from "@/lib/handles" for ergonomics; individual file
// paths remain valid for tree-shaking sensitive contexts.

export {
  RESERVED_HANDLES,
  isReservedHandle,
  isReservedHandleStrict,
} from "./reserved";
export type { ReservedHandle } from "./reserved";

export {
  HANDLE_MIN_LENGTH,
  HANDLE_MAX_LENGTH,
  HANDLE_REGEX,
  validateHandle,
} from "./validate";
export type { HandleValidationError } from "./validate";

export {
  INSTAGRAM_HANDLE_REGEX,
  validateInstagramHandle,
} from "./instagram";
export type { InstagramValidationError } from "./instagram";

export {
  HANDLE_CHANGE_LOCK_DAYS,
  canChangeHandle,
} from "./change";

export {
  HANDLE_ERROR_MESSAGES_KO,
  IG_ERROR_MESSAGES_KO,
} from "./messages";
