// Reserved handles — cannot be claimed by users. Validated at signup +
// handle change (G2 Task 5). Source of truth: this file. citext UNIQUE
// at DB level is a defense-in-depth backup.
//
// Source of decisions: Phase 2.5 G2 Entry Decision Package §B (2026-04-23).
// Add to this list with care — once a handle is added here, any existing
// user holding that handle becomes unable to retain it on next change.
// Audit DB before adding new entries: SELECT handle FROM profiles WHERE
// handle ILIKE 'NEW_RESERVED'.

export const RESERVED_HANDLES = [
  // === System routes (URL collision) ===
  "admin", "api", "app", "auth", "dashboard", "settings", "system",
  "callback", "logout", "signin", "signup", "signout", "login", "register",
  "onboarding", "forgot-password", "reset-password",

  // === Phase 2.5 routes ===
  "challenges", "challenge", "gallery", "submit", "judge", "announce",
  "winners", "winner", "showcase", "showcases", "u", "user", "users",
  "profile", "profiles", "creators", "studios", "creator", "studio",
  "observer",

  // === Existing routes (Phase 1.x) ===
  "projects", "project", "meetings", "meeting", "invoices", "invoice",
  "team", "teams", "preprod", "brands", "brand", "billing", "storyboards",
  "storyboard", "notifications", "notification", "journal", "work",
  "guide", "guides", "share", "s",

  // === Common SaaS reservations ===
  "about", "blog", "contact", "faq", "feedback", "help", "home", "index",
  "legal", "privacy", "terms", "tos", "press", "support", "status",
  "pricing", "features", "docs", "documentation", "changelog", "roadmap",
  "security", "abuse", "report", "search", "explore", "discover",
  "trending", "popular", "recent", "new", "edit", "delete", "create",
  "view", "list", "404", "500", "error", "test", "demo", "sandbox",

  // === Brand protection (YAGI) ===
  "yagi", "yagiworkshop", "yagi-workshop", "yagiworkshopstudio",
  "yagi-studio", "yagistudio", "야기", "야기워크숍", "official",
  "anthropic", "claude",

  // === Korean policy + legal ===
  "kcc", "kisa", "ftc", "korea", "한국", "정부", "관리자", "고객센터",
  "문의", "신고", "공지", "공지사항",

  // === Content moderation (default-deny) ===
  // 욕설, 성적 표현, 차별 표현, 정치 관련 — 추가 keyword는 별도
  // moderation list로 관리 (Phase 2.7+). 여기에는 high-confidence cases만.
  "fuck", "shit", "porn", "sex", "nude", "nazi", "hitler",
  "씨발", "좆", "년", "놈", "개새끼",
] as const;

export type ReservedHandle = typeof RESERVED_HANDLES[number];

/**
 * Check if a handle is reserved. Case-insensitive (citext semantics).
 */
export function isReservedHandle(handle: string): boolean {
  const normalized = handle.toLowerCase().trim();
  return (RESERVED_HANDLES as readonly string[]).includes(normalized);
}

/**
 * Check with prefix-aware variants (e.g. "admin1" allowed, "admin" blocked).
 * Use when handle policy needs to allow numeric suffixes for non-reserved
 * but related names. Currently NOT used — handles are exact-match reserved.
 * Kept here for future flexibility.
 */
export function isReservedHandleStrict(handle: string): boolean {
  return isReservedHandle(handle);
}
