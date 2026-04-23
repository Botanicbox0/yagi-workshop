# Phase 2.5 G2 — Entry Decision Package

**Status:** READY FOR ADOPTION (web Claude pre-authored, 2026-04-23)
**Purpose:** Provide drop-in decisions + spec-grade artifacts so G2 Builder
can move from "kickoff" to "implementation" with zero idle time on
野기 deliberation.
**Adoption:** 야기 reviews each section, marks ADOPT / EDIT / REJECT, then
Builder consumes adopted sections as authoritative input.
**Disjoint:** Pure documentation. No src/, supabase/, or .yagi-autobuild/
write outside this file.

---

## §A — ADR-009: Role type system reconciliation

### Status: PROPOSED (야기 ADOPT/EDIT/REJECT required)

### Context

Phase 2.5 G1 introduced `profiles.role IN ('creator','studio','observer')`,
intended as the **persona role** for the public Challenge Platform. Per
SPEC v2 §1.2, this is **orthogonal** to the existing Phase 1.1 system
`user_roles.role IN ('yagi_admin','workspace_admin','workspace_member','creator')`.

The literal string `creator` collides between the two systems:

- `user_roles.role='creator'` is currently used in `src/app/[locale]/app/layout.tsx`
  as part of `hasPrivilegedGlobalRole` to allow workspace-less app access
  (a Phase 1.1 contract: a "creator" in workspace lingo can use the app
  without joining a workspace). Originally seeded to enable solo-creator
  usage of preprod / showcase tools.
- `profiles.role='creator'` (Phase 2.5) is the AI Creator persona who
  participates in Challenges. Has nothing to do with workspace permissions.

Without disambiguation, downstream code reading `roles.includes('creator')`
will silently mean different things in different files. This is a class-
of-bug pattern (string-typed enums sharing literals across orthogonal
namespaces) that compounds quickly.

### Decision

Adopt **Option C: type discrimination + scope hook**.

#### Type system

In `src/lib/app/context.ts`:

```ts
// Phase 1.1 workspace permission system — unchanged literal, renamed type.
export type WorkspaceRole =
  | "yagi_admin"
  | "workspace_admin"
  | "workspace_member"
  | "creator";  // legacy: "workspace-less app access" semantic

// Phase 2.5 challenge persona system — distinct type, distinct namespace.
export type ProfileRole = "creator" | "studio" | "observer";

// AppContext exposes both as separate fields. Never overloaded.
export type AppContext = {
  userId: string;
  profile: {
    id: string;
    handle: string;
    display_name: string;
    avatar_url: string | null;
    locale: "ko" | "en";
    role: ProfileRole | null;  // NEW — from profiles.role (Phase 2.5)
  };
  workspaceRoles: WorkspaceRole[];  // RENAMED from `roles`
  workspaces: { id: string; name: string; slug: string }[];
  currentWorkspaceId: string | null;
};
```

Migration impact:
- `ctx.roles` → `ctx.workspaceRoles` (mechanical rename, all call sites)
- `ctx.profile.role` is new (Phase 2.5 G2 populates this from `profiles.role`)
- No DB change

#### Naming rule (durable)

Whenever a code site needs to ask "what kind of user is this?", **always
prefix with the system name**:
- `workspaceRoles.includes('creator')` — "is this user a Phase 1.1 workspace
  creator (workspace-less app access entitlement)?"
- `profile.role === 'creator'` — "is this user a Phase 2.5 AI Creator
  persona (Challenge participant)?"

Code reviewers reject any usage of bare `roles.includes('creator')` after
this ADR — it's a type error AND a semantic error.

#### Future cleanup (deferred — Phase 3+)

Renaming the Phase 1.1 `creator` literal to `solo_user` or
`workspaceless_creator` is the cleaner long-term fix but requires a DB
migration on `user_roles` + reseeding existing rows + auth flow rework.
Not blocking for Phase 2.5. Logged in `FOLLOWUPS.md` as FU-9.

### Consequences

- (+) Type system surfaces the conflict at every call site; impossible
      to write `roles.includes('creator')` without TypeScript error
      pointing at the namespace ambiguity.
- (+) Reads like documentation: `profile.role === 'creator'` is
      unambiguous in code review.
- (+) Phase 1.1 rows untouched. Migration is TS-only, instant.
- (–) Mechanical rename touches every file that reads `ctx.roles`. Likely
      ~10-15 sites based on grep. Trivial codemod.
- (–) `creators` table (Phase 2.5) and `creator` workspace role share
      stem. Mitigated by the strict prefix rule.

### Alternatives considered

- **Option A**: Rename Phase 1.1 `creator` to `solo_user` immediately.
  Rejected: requires DB migration on already-shipped Phase 1.1 system,
  reseed existing rows, update auth provisioning. Phase 2.5 scope creep.
- **Option B**: Add `WorkspaceRole` / `ProfileRole` types but keep
  shared `roles` field (typed as union). Rejected: shared field still
  invites bug class. Two fields > one union.
- **Option D**: String prefixes (`ws:creator`, `pr:creator`). Rejected:
  ugly at call site, requires runtime parsing, not idiomatic TS.

### Workspace-skip semantic clarification (audit MED #1)

Phase 2.5 Creator/Studio personas do NOT insert `user_roles.role='creator'`
during G2 onboarding. Their `profiles.role` value (`creator`/`studio`/`observer`)
is independent from the Phase 1.1 `user_roles` workspace-permission system.

Consequence:
- A Phase 2.5 Creator who has not joined any workspace and lacks Phase 1.1
  `user_roles.role='creator'` will, if they navigate to `/[locale]/app/*`,
  hit the existing `hasPrivilegedGlobalRole` gate at `src/app/[locale]/app/layout.tsx:28-29`
  and be redirected to `/onboarding/workspace`. **This is correct behavior** —
  Phase 2.5's product surfaces are locale-free (`/u/<handle>`, `/challenges/*`,
  `/settings/profile` if locale-free in G6) and do not require workspace membership.
- The Phase 1.1 `user_roles.role='creator'` literal remains reserved for the
  legacy "workspace-skip entitlement" semantic — used by Phase 1.x solo creators
  who were grandfathered into the app without a workspace. ADR-009 deliberately
  preserves this literal rather than renaming, to avoid Phase 1.1 schema migration.
- A user CAN simultaneously hold Phase 1.1 `user_roles.role='creator'` (legacy
  workspace-skip) AND Phase 2.5 `profiles.role='creator'` (Challenge Platform persona).
  These are orthogonal permissions; no migration unifies them.

### Adoption checklist (Builder consumes after ADOPT)

1. Edit `src/lib/app/context.ts`: introduce `WorkspaceRole` + `ProfileRole`
   types, rename field `roles` → `workspaceRoles`, add `profile.role`.
2. Update `fetchAppContext`: select `role` from `profiles` table, return
   in `profile.role`.
3. Codemod: `git grep "ctx.roles" src/` → rename to `ctx.workspaceRoles`.
   Same for destructuring (`const { roles } = ctx` → `workspaceRoles`).
4. Codemod: `git grep "roles.includes('creator')" src/` → audit each site.
   If site is workspace permission check, `workspaceRoles.includes('creator')`.
   If site should be Phase 2.5 persona check, `profile.role === 'creator'`.
5. Update `src/components/app/sidebar-nav.tsx` `Item.roles: Role[]` →
   `Item.roles: WorkspaceRole[]`.
6. Run `tsc --noEmit` — should be clean after all rename sites updated.
7. Append ADR-009 to `docs/design/DECISIONS.md` (use this section's
   §A body verbatim).

---

## §B — Reserved handles list (Korean SaaS context)

### Status: PROPOSED (야기 ADOPT/EDIT/REJECT)

Source of truth per SPEC v2 §3 G1 Task 5: `src/lib/handles/reserved.ts`
(NOT a DB table). Validated at signup + handle change.

### List

Categorized for review legibility. All entries are **lowercase** (handles
are citext UNIQUE — case insensitive at storage layer).

```typescript
// src/lib/handles/reserved.ts
//
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
```

### Sourcing rationale

- **System routes** — sourced from `src/app/` route inventory (audit
  performed 2026-04-23 turn).
- **Phase 2.5 routes** — sourced from SPEC v2 §3 G3-G6 route table.
- **Common SaaS reservations** — sourced from
  github.com/shouldbee/reserved-usernames (590+ list curated for SaaS) +
  GitLab `path_regex.rb` reserved list, filtered down to entries actually
  meaningful for YAGI Workshop's product surface.
- **Brand protection** — `yagi` family + collaborator brand
  (`anthropic`, `claude`) reserved to prevent impersonation. Korean
  variants (`야기`, `야기워크숍`) reserved despite handle policy
  technically prohibiting Hangul (defense-in-depth).
- **Korean policy + legal** — government/regulator names + complaint
  channel keywords. Block impersonation as official body.
- **Content moderation** — minimal high-confidence list. Comprehensive
  word filter is a separate Phase 2.7+ moderation pipeline.

### Decisions for 야기

1. Brand protection: include or exclude `anthropic` / `claude`?
   (Recommendation: include — partner relationship deserves trademark
   protection. Edit if 야기 prefers to leave open.)
2. Hangul reservations (`야기`, `한국`, etc.) — handle policy will
   technically reject Hangul (only ASCII allowed per §C below), but
   reserving Hangul stems anyway is defense-in-depth. Keep or drop?
3. Content moderation list scope — current list is 13 entries
   (high-confidence). Acceptable as MVP, with Phase 2.7 moderation
   pipeline as the comprehensive solution. Confirm.

---

## §C — Handle validation regex + policy

### Status: PROPOSED (야기 ADOPT/EDIT/REJECT)

### Final regex

```typescript
// src/lib/handles/validate.ts

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
```

### Korean error messages (G2 i18n)

```ts
// src/lib/handles/messages.ts
export const HANDLE_ERROR_MESSAGES_KO: Record<HandleValidationError, string> = {
  TOO_SHORT: "핸들은 최소 3자 이상이어야 합니다.",
  TOO_LONG: "핸들은 최대 30자까지 가능합니다.",
  INVALID_CHARS: "영문 소문자, 숫자, 밑줄(_)만 사용할 수 있습니다.",
  INVALID_START: "핸들은 영문 소문자로 시작해야 합니다.",
  INVALID_END: "핸들은 영문 소문자 또는 숫자로 끝나야 합니다.",
  CONSECUTIVE_UNDERSCORE: "밑줄(_)을 연속으로 사용할 수 없습니다.",
  RESERVED: "이 핸들은 사용할 수 없습니다. 다른 이름을 시도해 주세요.",
};
```

### Policy decisions (rationale)

- **No Hangul in handles**: URL-safe + Instagram-style + global community
  precedent. Display name (`profile.display_name`) carries Hangul if
  desired; handle is the URL slug.
- **No dots, dashes, or other punctuation**: Reduces ambiguity, prevents
  homograph attacks (e.g. `yagi.com` vs `yagi-com`). Underscore alone
  allowed because it's the most common separator in handle culture.
- **Minimum 3 chars**: 2-char handles invite squatting and are visually
  poor. 3 is the same floor as Twitter, GitHub.
- **Maximum 30 chars**: matches Instagram, gives ample room for branded
  handles like `yagi_workshop_official_kr`.
- **Lowercase only**: citext at DB layer makes case insensitive anyway,
  but enforcing lowercase at input prevents user confusion.
- **No reserved-list bypass via prefix**: `admin1` is allowed, `admin` is
  blocked. Strict exact-match reservation. If Phase 2.7 reveals abuse
  pattern (e.g. `admin_official`), promote to prefix-based with the
  `isReservedHandleStrict` hook (already stubbed in §B).

### Decisions for 야기

1. Min length 3 OK? (Could be 4 if 야기 wants higher-quality handles.)
2. Allow underscore? (Some Korean SaaS disallow underscore for visual
   cleanness. Twitter/GitHub allow. Recommendation: allow.)
3. Allow numerics in any position? (Currently allowed except as start
   char. Some platforms restrict to "no all-numeric handles" — easy
   add if 야기 wants.)

---

## §D — Instagram handle validation

### Status: PROPOSED (야기 ADOPT/EDIT/REJECT)

### Spec

Instagram official handle policy (verified from Meta documentation):
- 1-30 characters
- Letters, numbers, underscore, period
- No consecutive periods
- Cannot start or end with period
- Case insensitive (lowercase canonical)

### Implementation

```typescript
// src/lib/handles/instagram.ts

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
```

### Storage convention

- DB column `profiles.instagram_handle` stores **canonical form**:
  lowercase, no `@` prefix, no leading/trailing whitespace.
- Display layer renders with `@` prefix: `@${profile.instagram_handle}`.
- External link: `https://instagram.com/${profile.instagram_handle}`.

### Korean error messages (G2 i18n)

```ts
export const IG_ERROR_MESSAGES_KO: Record<InstagramValidationError, string> = {
  EMPTY: "Instagram 핸들을 입력해 주세요.",
  TOO_LONG: "Instagram 핸들은 최대 30자까지 가능합니다.",
  INVALID_CHARS: "영문, 숫자, 마침표(.), 밑줄(_)만 사용할 수 있습니다.",
  CONSECUTIVE_DOTS: "마침표(.)를 연속으로 사용할 수 없습니다.",
  STARTS_OR_ENDS_WITH_DOT: "마침표(.)로 시작하거나 끝날 수 없습니다.",
};
```

### Decisions for 야기

1. Mandatory at signup per SPEC §2 #2 — but should it be **verified**
   (via Instagram API) or **trust-based** (just stored)?
   Recommendation: trust-based for MVP (SPEC §0 non-goals lists no
   verification). Verification is a Phase 3+ feature. Simply stored,
   displayed with `@` prefix on profile.
2. Allow uniqueness? Two YAGI users could both claim `@yagi` —
   current spec says "uniqueness not required". Confirm.
3. What if user has no Instagram? SPEC §2 #2 says "mandatory" — but
   reality has Instagram-less users. Recommendation: enforce mandatory
   per SPEC, with placeholder option `_no_instagram_` reserved for
   users who genuinely don't have one. Better recommendation: allow
   skip with explicit checkbox "Instagram 계정이 없습니다" → store
   NULL. Decide.

---

## §E — 90-day handle change lock — UI/UX flow

### Status: PROPOSED (야기 ADOPT/EDIT/REJECT)

### Backend rule

`profiles.handle_changed_at` (added in G1 migration). Server enforces:

```ts
// src/lib/handles/change.ts
export const HANDLE_CHANGE_LOCK_DAYS = 90;

export function canChangeHandle(handle_changed_at: Date | null): {
  allowed: boolean;
  daysRemaining: number;
  unlockAt: Date | null;
} {
  if (handle_changed_at === null) {
    return { allowed: true, daysRemaining: 0, unlockAt: null };
  }
  const lockEnd = new Date(handle_changed_at);
  lockEnd.setDate(lockEnd.getDate() + HANDLE_CHANGE_LOCK_DAYS);
  const now = new Date();
  if (now >= lockEnd) {
    return { allowed: true, daysRemaining: 0, unlockAt: null };
  }
  const msRemaining = lockEnd.getTime() - now.getTime();
  const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));
  return { allowed: false, daysRemaining, unlockAt: lockEnd };
}
```

### UI flow

Settings page handle row has 3 states:

**State 1 — Never changed** (`handle_changed_at IS NULL`):
```
핸들 (URL)              @yagi                            [변경하기]
                       yagiworkshop.xyz/u/yagi
```

**State 2 — Locked** (within 90 days):
```
핸들 (URL)              @yagi                            [변경 불가]
                       yagiworkshop.xyz/u/yagi
                       다음 변경 가능: 2026년 7월 22일까지 64일 남음 (i)
                                                                    ↓ tooltip
                       핸들은 90일에 한 번만 변경할 수 있습니다.
                       자주 변경하면 다른 사용자에게 혼란을 줄 수 있어요.
```

**State 3 — Unlocked** (after 90 days):
```
핸들 (URL)              @yagi                            [변경하기]
                       yagiworkshop.xyz/u/yagi
                       마지막 변경: 2025년 12월 23일
```

### Change modal

When `[변경하기]` clicked:

```
┌─ 핸들 변경 ────────────────────────────────────────────┐
│                                                       │
│  현재 핸들                                              │
│  @yagi → yagiworkshop.xyz/u/yagi                      │
│                                                       │
│  새 핸들                                                │
│  @ [_______________________]                          │
│     yagiworkshop.xyz/u/_____                          │
│  3-30자, 영문 소문자, 숫자, 밑줄(_)                     │
│                                                       │
│  ⚠ 안내                                                │
│  • 변경 후 90일간 다시 변경할 수 없습니다.               │
│  • 이전 핸들 (@yagi) 은 다른 사용자가 가져갈 수 없도록   │
│    영구 예약됩니다 (squatting 방지).                    │
│  • 기존 링크 (yagiworkshop.xyz/u/yagi) 는 자동으로     │
│    새 핸들로 리다이렉트됩니다.                          │
│                                                       │
│              [취소]              [핸들 변경]            │
└────────────────────────────────────────────────────────┘
```

### Old handle reservation (anti-squatting)

When handle changes from `old_handle` → `new_handle`:

```sql
-- (G2 server action, executed in transaction)
INSERT INTO public.handle_history (
  user_id, old_handle, new_handle, changed_at
) VALUES ($1, $2, $3, now());

UPDATE public.profiles
SET handle = $3, handle_changed_at = now()
WHERE id = $1;
```

Then handle availability check (in `validateHandle` extension) reads:
```sql
SELECT 1 FROM public.handle_history WHERE old_handle = $1
UNION ALL
SELECT 1 FROM public.profiles WHERE handle = $1
LIMIT 1;
```

If any row returned → handle taken (current or historically).

**This requires a new table `handle_history`** which is **NOT in G1
migration**. Decision needed for G2:
- Option A: Add `handle_history` table in G2 (new migration). Recommended.
- Option B: Embed history as JSON array in `profiles.handle_history_json`.
  Cheaper but loses queryability. Not recommended.

→ **Web Claude recommendation: Option A.** Includes redirect URL handling
in G6 profile surface (old `/u/old_handle` 301-redirects to `/u/new_handle`
by reading `handle_history`).

### Decisions for 야기

1. 90 days OK or different? (Twitter: never-locked. Instagram: 14-day
   lock between changes. GitHub: no lock. 90 is conservative — if 야기
   wants more flexibility, 30 days is also defensible.)
2. Old handle anti-squatting: enforce permanently or with TTL (e.g. 1
   year then released)? Recommendation: permanent (Twitter pattern).
3. Add `handle_history` table in G2? (Recommended.)
4. Old handle redirect (301 from `/u/old` → `/u/new`)? (Recommended,
   G6 work item.)

---

## §F — Signup → role selection flow (G2 main path)

### Status: PROPOSED (야기 ADOPT/EDIT/REJECT)

Per SPEC §3 G2 Task 1-2, signup → role → profile creation. Visualized
end-to-end:

```
Step 1: Email + Password (existing /[locale]/(auth)/signup)
   │
   ↓ POST → Supabase Auth signUp
   │
Step 2: Email confirmation (existing flow, unchanged)
   │
   ↓ /auth/callback → user authenticated
   │
Step 3: NEW — /[locale]/onboarding/role
   │
   │  "환영합니다! YAGI Workshop에서 어떤 역할로 활동하실 건가요?"
   │
   │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
   │  │ AI Creator   │ │ AI Studio    │ │ Observer     │
   │  │              │ │              │ │              │
   │  │ 챌린지에 참여 │ │ 팀으로 참여   │ │ 둘러보기/투표 │
   │  │ 작품 발표     │ │ 상업적 활동   │ │              │
   │  │              │ │              │ │              │
   │  │ [ 선택 ]     │ │ [ 선택 ]     │ │ [ 선택 ]     │
   │  └──────────────┘ └──────────────┘ └──────────────┘
   │
   ↓ POST → /api/onboarding/role (sets profiles.role)
   │
Step 4a: Creator → /[locale]/onboarding/profile/creator
Step 4b: Studio  → /[locale]/onboarding/profile/studio
Step 4c: Observer → /[locale]/onboarding/profile/observer
   │
   │  Common fields:
   │    handle (validated per §C, live availability check)
   │    instagram_handle (validated per §D)
   │
   │  Role-specific:
   │    Creator: display_name (1-80 chars), bio (optional, ≤200 chars)
   │    Studio:  studio_name, contact_email (default to signup email),
   │             member_count (1-5 / 6-10 / 11+)
   │    Observer: nothing extra (handle is the display)
   │
   ↓ POST → /api/onboarding/profile (inserts creators or studios row,
   │                                  populates profiles handle/ig)
   │
Step 5: Redirect to /u/<handle> (own profile page) with welcome banner
```

### Idempotency + resumption

User refreshes mid-flow → AppLayout's `fetchAppContext` redirect logic
(already exists at `src/app/[locale]/app/layout.tsx`) detects partial
state and redirects to correct step:

- `profile.role IS NULL` → `/onboarding/role`
- `profile.role IS SET` AND `profile.handle IS NULL` → `/onboarding/profile/<role>`
- All set → `/u/<handle>`

Existing `redirect({ href: "/onboarding/...", locale })` pattern used.

### Decisions for 야기

1. Role copy text in Korean — adopt above as-is or wordsmith?
2. Studio `member_count` enum buckets correct (1-5, 6-10, 11+)?
   Or wider (1-3, 4-10, 11-50, 50+)?
3. Observer onboarding: ask for handle + instagram OR just handle?
   SPEC §1 says Observer has minimal profile. Recommendation:
   handle mandatory (URL needed), Instagram optional for Observer
   (since they're not promoting work).
4. Step 5 redirect: `/u/<handle>` makes sense for Creator/Studio
   (they want to see their own profile). For Observer, redirect to
   `/challenges` (they came to browse) might be better. Decide.

---

## §G — File inventory (G2 deliverables)

For Builder reference — all G2 produces these files:

```
src/lib/handles/
  ├── reserved.ts        (§B verbatim)
  ├── validate.ts        (§C verbatim)
  ├── instagram.ts       (§D verbatim)
  ├── change.ts          (§E backend rule)
  └── messages.ts        (§C + §D Korean error messages)

src/app/[locale]/onboarding/
  ├── role/page.tsx              (§F Step 3 — role selection)
  ├── profile/creator/page.tsx   (§F Step 4a)
  ├── profile/studio/page.tsx    (§F Step 4b)
  └── profile/observer/page.tsx  (§F Step 4c)

src/app/api/onboarding/
  ├── role/route.ts       (POST — sets profiles.role)
  └── profile/route.ts    (POST — inserts creators/studios + handle/ig)

src/lib/app/context.ts
  └── (modified per §A — WorkspaceRole/ProfileRole types)

supabase/migrations/
  └── 20260424000000_phase_2_5_g2_handle_history.sql
       (new — handle_history table per §E)

docs/design/DECISIONS.md
  └── (append ADR-009 per §A)

.yagi-autobuild/phase-2-5/
  └── (no changes — this Decision Package is consumed, not committed)
```

### Codemod sites for ADR-009 rename

Estimated grep targets (Builder verifies before edit):
- `ctx.roles` — likely ~10 sites
- `roles.includes(` — ~6 sites in app/(auth) + sidebar + admin gates
- `Role[]` type usage — ~4 sites
- `import { Role } from` — ~5 sites

Trivial codemod, ~30 min.

### Modified files (existing)

- `src/app/[locale]/app/settings/profile-form.tsx` — handle validation
  unification per §C: replace local `2-40 chars` regex with import from
  `@/lib/handles/validate`. Existing user records with handles in
  `2 ≤ len < 3` range: 0 (verified at G1 — pre-flight returned 1 row,
  handle present, length compliant). Backward-compat trivial.

- `src/app/[locale]/onboarding/profile/page.tsx` (Phase 1.1 legacy) —
  deprecated; redirect to `/onboarding/role` (G2 §F Step 3) at G2 merge.
  Existing route preserves backward-compat for any in-flight Phase 1.1
  onboarding sessions for 30 days, then deletion follow-up at Phase 2.6.

---

## §H — G2 entry checklist

When 야기 is ready to enter G2, run this checklist:

```
[ ] §A ADR-009 — adopted? (mark ADOPT/EDIT/REJECT)
[ ] §B Reserved handles list — adopted? (any additions?)
[ ] §C Handle validation — min length / dots / underscore decisions?
[ ] §D Instagram handle — verification mode? unique? skip option?
[ ] §E 90-day lock — duration + handle_history table?
[ ] §F Signup flow — role copy + member_count buckets + Observer redirect?
[ ] sidebar audit (사이드 트랙 결과) reviewed?
[ ] Phase 2.4 G1 closeout status — applied yet? (affects token rendering
    in onboarding pages, NOT logic)
[ ] FU-1 (정보통신망법 §50 marketing opt-in) — confirm: deferred to G7
    per §A footer + FOLLOWUPS.md? Yes / No
```

When all `[ ]` resolved,던지기:

```
GO G2.

Read .yagi-autobuild/phase-2-5/G2-ENTRY-DECISION-PACKAGE.md.
Adopted decisions: §A ADR-009, §B reserved list, §C handle regex,
§D Instagram trust-based, §E 90-day + handle_history, §F all defaults
[edit any deviations here].

Execute G2 per SPEC v2 §3 G2 + Decision Package §G file inventory.
Stop point per SPEC: none (internal). Tsc + e2e smoke at completion.
Commit message: "feat(phase-2-5): G2 — auth + role selection (ADR-009)".
Telegram on completion.
```

---

## §I — Status

This Decision Package authored by web Claude during G1 closeout window
(2026-04-23). Designed for ZERO turn-around at G2 entry — 야기 reads,
adopts, Builder runs.

Not committed. Not part of `.yagi-autobuild/` until 야기 reviews. After
review, save as `.yagi-autobuild/phase-2-5/G2-ENTRY-DECISION-PACKAGE.md`
(or rename per yagi preference).

End.
