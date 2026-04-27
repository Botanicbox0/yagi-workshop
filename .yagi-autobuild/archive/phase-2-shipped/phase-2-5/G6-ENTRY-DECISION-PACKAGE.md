# Phase 2.5 G6 — Entry Decision Package

**Status:** READY FOR ADOPTION (web Claude pre-authored, 2026-04-24 overnight)
**Purpose:** Drop-in decisions for `/u/[handle]` public profile + `/settings/profile` edit surface.
**Adoption:** Decisions below marked PROPOSED with recommended default. Gate Autopilot Step 5 scans DECISIONS_CACHE.md for matches.
**Scope ref:** SPEC v2 §3 G6 + G2-G8-PRE-AUDIT/G6-profile-surface.md

---

## §0 — CRITICAL PREREQUISITE: G0 pre-work (FU-SCOPES-1)

### Status: BLOCKER (must land BEFORE G6 first commit)

Before any G6 Server Component reads `profile.role` for UI gating (edit-affordance, role badge), the shared `useUserScopes()` hook + scope resolver MUST be in place. Phase 2.6 SPEC.md §7 "G0 fragility guard" requires this.

### Action at G6 entry (Step 0)

**Verify first:**
```bash
test -f src/lib/app/scopes.ts && \
  grep -q "export function getUserScopes" src/lib/app/scopes.ts && \
  test -f src/lib/app/use-user-scopes.ts && \
  grep -q "export function useUserScopes" src/lib/app/use-user-scopes.ts
```

Exit 0 → skip to G6 main tasks.
Exit non-zero → execute G0 pre-work FIRST (spec below), then G6.

### G0 pre-work spec (inline — so Builder doesn't need to cross-ref Phase 2.6 docs)

**File 1:** `src/lib/app/scopes.ts`

```ts
import type { AppContext } from "@/lib/app/context";

export type Scope =
  | { kind: "workspace"; id: string; name: string; href: string; active: boolean }
  | { kind: "profile";   handle: string; display_name: string; href: string; active: boolean }
  | { kind: "admin";     name: string; href: string; active: boolean };

export function getUserScopes(ctx: AppContext, currentPath?: string): Scope[] {
  const scopes: Scope[] = [];

  for (const ws of ctx.workspaces) {
    scopes.push({
      kind: "workspace",
      id: ws.id,
      name: ws.name,
      href: "/app",
      active: currentPath?.startsWith("/app") && !currentPath.startsWith("/app/admin") || false,
    });
  }

  if (ctx.profile.role === "creator" || ctx.profile.role === "studio") {
    scopes.push({
      kind: "profile",
      handle: ctx.profile.handle,
      display_name: ctx.profile.display_name,
      href: `/u/${ctx.profile.handle}`,
      active: currentPath?.startsWith(`/u/${ctx.profile.handle}`) || false,
    });
  }

  if (ctx.workspaceRoles.includes("yagi_admin")) {
    scopes.push({
      kind: "admin",
      name: "Yagi Admin",
      href: "/app/admin",
      active: currentPath?.startsWith("/app/admin") || false,
    });
  }

  return scopes;
}
```

**File 2:** `src/lib/app/use-user-scopes.ts`

```tsx
"use client";
import { createContext, useContext, type ReactNode } from "react";
import type { Scope } from "@/lib/app/scopes";

const UserScopesContext = createContext<Scope[] | null>(null);

export function UserScopesProvider({
  value,
  children,
}: {
  value: Scope[];
  children: ReactNode;
}) {
  return <UserScopesContext.Provider value={value}>{children}</UserScopesContext.Provider>;
}

export function useUserScopes(): Scope[] {
  const ctx = useContext(UserScopesContext);
  if (ctx === null) {
    if (process.env.NODE_ENV === "development") {
      throw new Error("useUserScopes called outside UserScopesProvider. Wrap app layout children.");
    }
    return [];
  }
  return ctx;
}
```

**File 3 (modify):** `src/app/[locale]/app/layout.tsx`

Add wrapper around children:

```tsx
import { getUserScopes } from "@/lib/app/scopes";
import { UserScopesProvider } from "@/lib/app/use-user-scopes";

// inside default export, after fetching ctx:
const scopes = getUserScopes(ctx);

return (
  // ... existing layout shell ...
  <UserScopesProvider value={scopes}>
    {children}
  </UserScopesProvider>
);
```

### Acceptance (G0)

- `pnpm exec tsc --noEmit` EXIT=0
- `pnpm lint` EXIT=0
- No behavior change for existing users (scopes array computed but not yet consumed — will be consumed by G6 edit affordance + Phase 2.6 G2 scope switcher)

### Telegram on G0 completion

```
✅ Phase 2.5 G0 (FU-SCOPES-1) SHIPPED — useUserScopes hook + scope resolver landed.
Proceeding to G6 main tasks.
```

---

## §A — Middleware matcher patch

### Status: CACHE HIT (Phase 2.1 G6 precedent, commit `5855dd0`)

### Decision

Add `u` to the exclusion list in `src/middleware.ts`:

```ts
"/((?!api|_next|_vercel|auth/callback|showcase|challenges|u|.*\\..*).*)"
```

One-line change. Verify:
```bash
curl -sI http://localhost:3003/u/test-handle  # expect 200, NOT 307
```

**Auto-adopt** (matches precedent).

---

## §B — `/u/[handle]` route structure

### Status: PROPOSED

### Decision

**Locale-free public profile** (mirrors `/showcase/[slug]`):

```
src/app/u/
  ├── layout.tsx                         (minimal, matches showcase pattern)
  ├── [handle]/
  │   ├── page.tsx                       (profile render)
  │   └── not-found.tsx                  (handle does not exist)
```

NOT under `[locale]` — handles are global, not locale-scoped. Korean/English toggle not meaningful for a user profile page.

Public chrome: reuse `<PublicChrome>` from G3 if appropriate, OR build minimal header with yagi-symbol + sign-in/out CTA. Recommendation: **minimal header, no full PublicChrome** — profile page is simpler surface than `/challenges`.

**Recommended: ADOPT.**

---

## §C — Profile page sections

### Status: PROPOSED

### Decision

Top-to-bottom layout:

```
[Header]
  yagi-symbol (left, → /) | sign in/out CTA (right, auth-aware)

[Hero]
  avatar (circular, 128×128) | display_name + role_badge | @handle

[Meta]
  Instagram link (always shown if set) + up to 3 external_links
  Bio (max 200 chars, markdown: bold/italic/link only)

[Divider]

[참여한 작품]  (section title)
  Submissions grid — aggregation across all challenges
  - 3 cols desktop / 2 tablet / 1 mobile
  - Each card: thumbnail, challenge title (linked), submission date
  - Empty state: "아직 참여한 챌린지가 없어요" (no imperatives — observer/upgrade CTA only for own profile)

[Owner-only floating button]
  "프로필 편집" → /app/settings/profile
```

### Role badge variants

- Creator: `bg-foreground/10 text-foreground border border-foreground/20` + "크리에이터"
- Studio: `bg-foreground/10 text-foreground border border-foreground/20` + "스튜디오"
- Observer: no badge (minimal profile, no public role display)

### Owner detection

Server-side: `session.user.id === profile.id` → render edit button. Consumes `useUserScopes` hook for consistency with Phase 2.6 scope switcher (ADR-009 naming rule).

**Recommended: ADOPT.**

---

## §D — Handle 90-day lock

### Status: PROPOSED

### Decision

Handle change rate limit enforced in BOTH layers:

**UI layer** (`src/app/[locale]/app/settings/profile-form.tsx`):
- Read `profile.handle_changed_at`
- If `now() - handle_changed_at < interval '90 days'`, disable handle field + show tooltip: "핸들은 90일에 한 번 변경할 수 있어요. 다음 변경 가능: {date}"

**Server Action layer** (`src/app/[locale]/app/settings/actions.ts`):
- `updateProfileExtendedAction` validates 90-day lock server-side (防止 client bypass)
- On valid change: UPDATE `handle` + stamp `handle_changed_at = now()`

### Old handle reservation (SPEC §6 Q7)

MVP: no `handle_holds` table. Old handle becomes insertable again after 90 days (because lock prevents self-reuse within 90d; squatters can claim after 90d — acceptable MVP risk at current user volume).

Phase 3+ revisit if squatting becomes real issue.

**Recommended: ADOPT (no handle_holds table).**

---

## §E — Avatar upload + crop

### Status: PROPOSED

### Decision

Reuse existing Phase 1.1 `avatars` bucket. 2MB client-side cap via image compression in canvas. Client-side crop UI via **react-image-crop** dep (small, maintained, ~30KB gzip).

Upload flow:
1. User selects file → `<input type="file" accept="image/*">`
2. Client crop UI (square, 512×512 target) using react-image-crop
3. Canvas export as JPEG quality 0.85 → Blob
4. If blob > 2MB, reduce quality to 0.7 and retry
5. Direct browser upload to Supabase Storage `avatars` bucket (path `{userId}/{uuid}.jpg`)
6. Update `profiles.avatar_url`

Component: `src/components/settings/avatar-upload.tsx` (new)

### Alternatives rejected

- **Native canvas-only crop**: works but non-trivial drag-handle UX. Not worth hand-rolling.
- **No crop (upload as-is)**: breaks 512×512 target, inconsistent avatar sizes.

### Dep add

```bash
pnpm add react-image-crop
```

One-time dep addition. Verify at G6 entry: confirm no existing crop primitive in codebase (survey said none, but re-verify before adding dep).

**Recommended: ADOPT.**

---

## §F — External links validation

### Status: PROPOSED

### Decision

Up to 3 user-defined external links. Each validated as HTTPS URL via Zod `.url()` + domain deny-list (no `javascript:`, no `data:`).

Storage: `profiles.external_links jsonb` — array of `{ label: string, url: string }` objects. `label` max 30 chars, `url` must pass Zod URL schema.

Client form: dynamic array (RHF `useFieldArray`), add/remove row, max 3 rows.

### Schema check

`profile.external_links` column existence: verify at G6 entry. If G1 migration didn't add it, add in small follow-up migration (or fold into G6 as schema addendum — though SPEC says Phase 2.6 is UI-only, Phase 2.5 G6 can still add column if gap found).

**Action at G6 entry:** `\d+ profiles` in Supabase SQL Editor, check `external_links` column present. If missing → add small migration `alter_profiles_add_external_links.sql`.

**Recommended: ADOPT + verify column at entry.**

---

## §G — Submissions aggregation query

### Status: PROPOSED

### Decision

Server query (SSR, no realtime):

```ts
// src/lib/profile/queries.ts
export async function getProfileByHandle(handle: string) {
  const supabase = await createSupabaseServer();

  const { data: profile } = await supabase
    .from("profiles")
    .select(`
      id, handle, display_name, role, bio, avatar_url,
      instagram_handle, external_links, handle_changed_at
    `)
    .eq("handle", handle)
    .maybeSingle();

  if (!profile) return null;

  const { data: submissions } = await supabase
    .from("challenge_submissions")
    .select(`
      id, challenge_id, content, created_at, status,
      challenge:challenges!inner(slug, title, state)
    `)
    .eq("submitter_id", profile.id)
    .eq("status", "ready")
    .neq("challenge.state", "draft")
    .order("created_at", { ascending: false });

  return { profile, submissions: submissions ?? [] };
}
```

RLS: public SELECT on both tables per G1 policies. Cross-table JOIN works via `!inner`.

**Recommended: ADOPT.**

---

## §H — Empty submissions state

### Status: PROPOSED

### Decision

No imperatives in empty state — profile can be viewed by anyone, including the profile owner. Generic observational copy:

```
아직 참여한 챌린지가 없어요
```

Do NOT show "첫 챌린지 도전해보세요!" or similar CTA — unknown if visitor is owner or not; assuming owner is presumptuous.

Edit button (owner only) remains as primary action affordance.

**Recommended: ADOPT.**

---

## §I — Role switch UI scope

### Status: PROPOSED — DEFERRED

### Decision

Role switch (Observer → Creator/Studio upgrade, Creator ↔ Studio) lives in separate `/settings/role` page, NOT the main profile edit form. **Deferred to Phase 2.6 BACKLOG** — G6 scope is profile edit only.

Rationale: role switch has cascading effects (RLS access changes, UI surface changes). Bundling with profile edit creates accidental-click risk.

MVP path: users contact 야기 directly for role upgrade; 야기 manually updates `profiles.role` via SQL Editor. Automate in Phase 2.6+.

**Recommended: ADOPT deferral.**

---

## §J — Cross-phase cautions

### Sidebar / header shell — NOT G6's scope

G6 **must not** modify:
- `src/components/app/sidebar.tsx`
- `src/components/app/sidebar-nav.tsx`
- `src/components/app/sidebar-workspace-switcher.tsx`
- `src/app/[locale]/app/layout.tsx` header (except §0 G0 provider wrapping)

These are Phase 2.6 scope (sidebar IA refactor + scope switcher).

### PRE-1 (ADR-009) consumption

G6 profile edit form reads `profile.role` via `AppContext.profile.role` (ProfileRole type). Role badge rendering uses `profile.role === 'creator'` etc. — NEVER `workspaceRoles.includes('creator')`.

Owner-only edit affordance uses `useUserScopes()` hook (G0 pre-work). Pattern:

```tsx
const scopes = useUserScopes();
const profileScope = scopes.find(s => s.kind === "profile");
const isOwner = profileScope?.handle === profile.handle;
```

This enforces ADR-009 naming rule + exercises the hook (Phase 2.6 SC #13).

---

## §K — Decisions needed from 야기 (cache MISS batch)

1. **Q-G6-1 (§0 G0):** Adopt G0 pre-work as spec-inlined (auto-execute if missing)? (Default: yes)
2. **Q-G6-2 (§B):** Locale-free `/u/[handle]` route (not under `[locale]`)? (Default: yes — mirrors showcase)
3. **Q-G6-3 (§C):** Role badge for Observer? (Default: no — keeps profile minimal for observers)
4. **Q-G6-4 (§D):** No `handle_holds` table for squatter protection (90-day self-lock sufficient)? (Default: yes)
5. **Q-G6-5 (§E):** Add `react-image-crop` dep? (Default: yes)
6. **Q-G6-6 (§F):** External links as `{label, url}` objects (vs plain URL array)? (Default: yes — labels improve UX)
7. **Q-G6-7 (§I):** Defer role switch UI to Phase 2.6 BACKLOG? (Default: yes)

Batch answer format:
```
G6: Q1=yes, Q2=yes, Q3=no, Q4=yes, Q5=yes, Q6=yes, Q7=yes
```

All defaults → proceed. Cache append: Q-026 through Q-032.

---

## §L — Success criteria (G6 closeout)

- [ ] §0 G0 pre-work landed (useUserScopes + scopes.ts)
- [ ] `/u/<handle>` renders for any valid handle (public SELECT RLS)
- [ ] `curl /u/nonexistent` → 404 via custom not-found.tsx
- [ ] `curl /u/test-handle` → 200, NOT 307 (middleware matcher patched)
- [ ] Role badge renders for creator/studio; absent for observer
- [ ] Submissions grid aggregates ready submissions across challenges
- [ ] Owner sees edit button via `useUserScopes` hook
- [ ] Non-owner does not see edit button
- [ ] `/settings/profile` form updates all new fields
- [ ] Handle 90-day lock enforced client + server
- [ ] Avatar upload → crop → Supabase Storage upload → profile update round-trip works
- [ ] `pnpm exec tsc --noEmit` + `pnpm lint` EXIT=0
- [ ] Design-system compliant (X1 audit rules)

---

**END OF G6 ENTRY DECISION PACKAGE**
