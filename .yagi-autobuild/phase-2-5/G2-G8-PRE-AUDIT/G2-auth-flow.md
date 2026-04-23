# G2 Pre-Audit — Auth flow + role selection

> Read-only audit. Pre-wave for Phase 2.5 SPEC §3 G2 entry.
> Source: src/ survey (2026-04-23, post-commit 58dbf6e).
> 🚨 Contains **PRE-1 CRITICAL drift** — see §3.

---

## 1. 현존 인프라 inventory (재사용 가능)

### Auth primitives
- `src/lib/supabase/server.ts` — `createSupabaseServer()` (SSR + cookies)
- `src/lib/supabase/client.ts` — `createSupabaseBrowser()`
- `src/lib/supabase/middleware.ts` — `updateSupabaseSession()` (session refresh)
- `src/lib/supabase/service.ts` — `createSupabaseService()` (service-role, admin ops)
- `src/middleware.ts:14-26` — matcher `"/((?!api|_next|_vercel|auth/callback|showcase|challenges|.*\\..*).*)"`; `/challenges` already excluded, `/u` NOT yet excluded (see G6)

### Existing signup/signin routes
- `src/app/[locale]/(auth)/signin/page.tsx` — email+password, RHF+Zod, client submit
- `src/app/[locale]/(auth)/signup/page.tsx` — email+password+confirm, RHF+Zod
- `src/app/[locale]/(auth)/forgot-password/page.tsx` — reset flow
- `src/app/auth/callback/route.ts:44-53` — post-confirm redirect logic (→ `/[locale]/onboarding` if no profile; `/[locale]/app` otherwise)
- Auth methods wired: **email+password only.** No magic link, no OAuth.

### Existing onboarding (Phase 1.1)
- `src/app/[locale]/onboarding/profile/page.tsx` — handle (3-30, lowercase+numbers+`-`+`_`), displayName, bio
- `src/lib/onboarding/actions.ts:8-38` — `createProfileAction` Server Action
  - Inserts `profiles` row (id, handle, display_name, bio, locale)
  - **If formData.role === 'creator': INSERT into `user_roles {user_id, role:'creator', workspace_id:null}`** — this is the Phase 1.1 privileged-global pattern
  - Role signature: `"client" | "creator"` (line 13) — **does not match SPEC §1.2 ('creator'/'studio'/'observer')**

### Profile-creation trigger
- **No DB trigger on `auth.users` insert.** Profile row is created explicitly by `createProfileAction`.

### shadcn primitives (all available for G2 forms)
Input, Textarea, Label, Button, Form (RHF integration), Select, Radio-group, Checkbox, Switch, Avatar, Dialog, Sheet, Alert-dialog, Sonner (toasts), plus 15+ others. **No new primitive needed for G2.**

---

## 2. 새로 만들어야 할 것 (G2 scope)

### New files
1. `src/lib/handles/reserved.ts` — exported `RESERVED_HANDLES` const (SPEC §6 Q4 full list; 35 entries)
2. `src/lib/handles/validation.ts` — `isValidHandle(handle)` + `isReservedHandle(handle)` (pure functions; mirror-tests in `.mjs` per Phase 2.1 G7 H1 precedent)
3. Role-selection step in signup flow — likely a new route `src/app/[locale]/onboarding/role/page.tsx` OR an inline step in existing `onboarding/profile/page.tsx`
4. Role-specific fields:
   - Creator: display_name (required), bio (optional, 200 char max)
   - Studio: studio_name (required), contact_email (default signup email), member_count (select: 1-5 / 6-10 / 11+)
   - Observer: handle is display
5. Instagram handle input (regex validation only; uniqueness NOT enforced)
6. Handle-change rate limit (90-day lock via `profiles.handle_changed_at`)

### Modified files
- `src/lib/onboarding/actions.ts` — fix role literal + write `profiles.role` + role-specific child row (`creators` or `studios`)
- `src/lib/app/context.ts` — **SEE §3 PRE-1 below. Type rename required.**
- `src/app/auth/callback/route.ts:44-53` — redirect logic may branch on `profiles.role IS NULL` (trigger role selection) vs completed

---

## 3. SPEC vs 현실 drift (의심점)

### 🚨 PRE-1 (CRITICAL, web Claude discovery 2026-04-23)

**File:** `src/lib/app/context.ts:3`

```typescript
export type Role = "creator" | "workspace_admin" | "workspace_member" | "yagi_admin";
```

**Collision:** Phase 1.1 `user_roles.role` uses literal `'creator'` (privileged global role — lets user skip workspace setup). Phase 2.5 G1 (commit 58dbf6e) added `profiles.role IN ('creator','studio','observer')` (challenge persona type). **Same TypeScript literal, two tables, two meanings.**

**Evidence:**
- `src/lib/app/context.ts:3` — `Role` union includes `'creator'` (reads `user_roles`)
- `src/app/[locale]/app/layout.tsx:28-29` — `hasPrivilegedGlobalRole = ctx.roles.includes("yagi_admin") || ctx.roles.includes("creator")` → this gates workspace-skip
- `src/lib/onboarding/actions.ts:30-34` — signup INSERTs `user_roles` with `role='creator'` for Phase 1.1 creators
- Phase 2.5 G1 migration (commit 58dbf6e) added `profiles.role` column with 'creator'/'studio'/'observer' enum values

**Why it matters for G2:**
- If G2 extends AppContext to surface `profiles.role`, any code touching `ctx.roles.includes('creator')` becomes ambiguous at the type level.
- SPEC §1.2 asserts "orthogonal" — true at DB level (separate tables, separate RLS), but TypeScript literal types conflate them.
- `src/lib/onboarding/actions.ts:13` hardcodes `"client" | "creator"` — must be updated to 3-role world, and **must decide: does a Phase 2.5 Creator/Studio/Observer signup ALSO INSERT `user_roles.role='creator'`?** If yes, the `hasPrivilegedGlobalRole` gate now grants workspace-skip to every new 2.5 signup, which may or may not be intended. If no, Phase 1.1 "client" users lose the workspace-skip privilege — breaking change.

### ADR-009 candidate (3 options)

**Option A — Type namespace + disambiguation (recommended)**
- Rename `Role` in `context.ts` → `UserRolesRole` (or `PrivilegedRole`)
- Add new type in `src/types/profile.ts`: `export type ProfilePersona = 'creator' | 'studio' | 'observer'`
- `AppContext.roles: UserRolesRole[]` unchanged; add `AppContext.persona: ProfilePersona | null` (new field, reads `profiles.role`)
- `hasPrivilegedGlobalRole` keeps reading `user_roles` (Phase 1.1 semantics preserved; zero behavior change)
- G2 role-selection writes to `profiles.role` only, does NOT touch `user_roles`
- Migration blast radius: 15+ files that reference `Role` type (per Explore survey), but all mechanical rename
- **Cost:** ~1h rename + type propagation

**Option B — Drop `user_roles.role='creator'` (breaking change)**
- Migration: DELETE `user_roles` rows with role='creator', or UPDATE to new literal (`'legacy_global_creator'`?)
- `hasPrivilegedGlobalRole` logic must be replaced (alternative workspace-skip trigger — e.g., `profiles.persona IN ('creator','studio')`)
- Collision eliminated at DB level
- **Cost:** DB migration + layout rewrite; affects Phase 1.x existing users

**Option C — Rename Phase 2.5 `profiles.role='creator'` → `'ai_creator'` (or `'individual'`)**
- Requires follow-up migration to ALTER CHECK constraint + data transform
- SPEC §1.2 deviation (SPEC explicitly lists 'creator')
- G1 migration (58dbf6e) already applied with 'creator'; amend is costly
- **Cost:** Amend migration + SPEC amendment; least recommended

**Recommendation: Option A.** Lowest blast radius, preserves Phase 1.1 semantics, eliminates TypeScript ambiguity. Builder should open ADR-009 before G2 starts.

### Other drift
- `src/lib/onboarding/actions.ts:13` — role union `"client" | "creator"` is **already wrong** relative to SPEC §1.2 (no 'client' role in Phase 2.5). G2 fix required.
- Handle validation regex drifts between files: `onboarding/profile/page.tsx:18` (3-30 chars, `-` allowed) vs `settings/profile-form.tsx:19` (2-40 chars, `-` NOT allowed). G2 must unify via new `src/lib/handles/validation.ts`.
- SPEC §3 G2 Task 6 says "90 days between handle changes", but no `handle_changed_at` read/write logic exists anywhere yet — G1 migration added the column; G2 must wire it.

---

## 4. 외부 의존 / ENV prereq

- No new ENV vars required for G2 itself.
- Resend (Phase 1.8) available for email confirmations — already wired in Phase 1.8 signup flow.
- Instagram handle is a free-text regex-validated string; no Instagram API dependency.

---

## 5. 테스트 전략 권고

| Layer | Scope | Pattern |
|---|---|---|
| Unit | `isValidHandle`, `isReservedHandle` | `.mjs` mirror-tests (Phase 2.1 G7 H1 precedent — `src/lib/ip-classify.test.mjs`) |
| Integration | `createProfileAction` → writes `profiles.role` + child table row + user_roles optionally | Direct Supabase call in test env, assert rows present |
| E2E | Full signup → role pick → profile page | curl-based auth API smoke (SPEC §3 G2 acceptance #3) |
| Manual QA | "Does a Phase 1.1 'client' existing user see their onboarding state correctly post-G2 migration?" | YAGI-MANUAL-QA-QUEUE.md entry |

**Regression targets:**
- Existing Phase 1.1 users with `user_roles.role='creator'` must NOT break.
- Existing users with no `profiles.role` (NULL post-G1 ALTER) must get a role-selection prompt rather than 500 error.

---

## 6. 잠재 야기 결정 항목

1. **ADR-009 direction** — confirm Option A (type namespace) before G2 starts, or pick B/C.
2. **Phase 1.1 "client" concept** — does "client" persona still exist semantically? If yes, where does it map in the 2.5 3-role world? If no, what happens to existing `user_roles`-less users?
3. **Workspace-skip privilege for Phase 2.5 Creator/Studio** — should a fresh Creator sign-up get `hasPrivilegedGlobalRole` treatment (skip workspace onboarding)? Currently the layout redirects to `/onboarding/workspace` unless privileged. If 2.5 Creators/Studios skip workspace onboarding, `user_roles.role='creator'` INSERT must happen alongside `profiles.role` INSERT.
4. **Handle validation unification range** — settle 2-40 vs 3-30 char range + `-` allowed or not. SPEC §3 G2 Task 3 says 3-30 + lowercase+numbers+underscore (no `-`). Onboarding code allows `-`. Pick one.
5. **Instagram handle opacity** — SPEC stores raw handle, no API verification. Confirm: is a broken/fake Instagram link acceptable on public profile? (Phase 2.6 could add verification.)
6. **Handle change cooldown math** — 90 days from what epoch (last change, last profile update, creation)? SPEC G1 stamps `handle_changed_at` only on change — confirm semantics.

---

**Cross-ref:** See `_summary.md` §PRE-1 for cross-gate propagation of this drift.
