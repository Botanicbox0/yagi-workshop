// Korean i18n messages for handle validation errors — Phase 2.5 G2.
// Source: G2 Entry Decision Package §C + §D (2026-04-23).
// Consumed by onboarding handle + Instagram input fields; displayed
// inline (Zod error render) rather than as toasts.

import type { HandleValidationError } from "./validate";
import type { InstagramValidationError } from "./instagram";

export const HANDLE_ERROR_MESSAGES_KO: Record<HandleValidationError, string> = {
  TOO_SHORT: "핸들은 최소 3자 이상이어야 합니다.",
  TOO_LONG: "핸들은 최대 30자까지 가능합니다.",
  INVALID_CHARS: "영문 소문자, 숫자, 밑줄(_)만 사용할 수 있습니다.",
  INVALID_START: "핸들은 영문 소문자로 시작해야 합니다.",
  INVALID_END: "핸들은 영문 소문자 또는 숫자로 끝나야 합니다.",
  CONSECUTIVE_UNDERSCORE: "밑줄(_)을 연속으로 사용할 수 없습니다.",
  RESERVED: "이 핸들은 사용할 수 없습니다. 다른 이름을 시도해 주세요.",
};

export const IG_ERROR_MESSAGES_KO: Record<InstagramValidationError, string> = {
  EMPTY: "Instagram 핸들을 입력해 주세요.",
  TOO_LONG: "Instagram 핸들은 최대 30자까지 가능합니다.",
  INVALID_CHARS: "영문, 숫자, 마침표(.), 밑줄(_)만 사용할 수 있습니다.",
  CONSECUTIVE_DOTS: "마침표(.)를 연속으로 사용할 수 없습니다.",
  STARTS_OR_ENDS_WITH_DOT: "마침표(.)로 시작하거나 끝날 수 없습니다.",
};
