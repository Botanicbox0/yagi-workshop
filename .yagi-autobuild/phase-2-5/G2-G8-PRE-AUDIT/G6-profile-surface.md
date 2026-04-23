# G6 Pre-Audit — Profile surface (`/u/<handle>` + `/settings/profile`)

> Source: src/ survey (2026-04-23).

---

## 1. 현존 인프라 inventory

### Settings profile (Phase 1.x)
- `src/app/[locale]/app/settings/page.tsx` — top-level settings page
- `src/app/[locale]/app/settings/profile-form.tsx` (1-202) — profile edit form
  - Fields: display_name, handle (2-40 chars lowercase+numbers+`_`), locale, avatar_url
  - Uses RHF + Zod
  - Avatar upload (line 81-86): direct browser upload to Supabase Storage bucket `avatars`, path: `{userId}/{randomUUID}.{ext}`
- `src/app/[locale]/app/settings/actions.ts` — Server Actions: `updateProfile`, `updateAvatarUrl`, `updateWorkspace`, `inviteMember`, `removeMember`

### Public `/u/<handle>`
- **Does NOT exist.** Phase 2.5 G6 creates it.

### Avatar upload
- Bucket: `avatars` (Phase 1.1)
- Pattern: direct browser upload (not signed URL)
- Path: `{userId}/{uuid}.{ext}` (RLS scoped on first segment)
- Max size: not enforced at current bucket level (need to verify); SPEC G6 says 2MB max + crop to 512×512 JPEG
- **Reusable unchanged for G6.**

### Middleware matcher
- `src/middleware.ts:14-26` — `/u` **NOT currently excluded** from intl redirect
- SPEC §3 G6 Task 1 mandates adding `u` to exclusion list
- One-line change, verify via `curl http://localhost:3003/u/test-handle` → HTTP 200 (not 307)

### i18n namespaces
Top-level present: brand, home, journal, about, common, onboarding, auth, **settings**, nav, dashboard, projects, refs, threads, admin, notifications
- G6 extends `settings.profile.*` for new fields
- `/u/<handle>` is locale-free (mirrors showcase) — minimal i18n surface

### Sidebar 3-tier shell (web Claude finding #1, confirmed)
- `src/components/app/sidebar.tsx` — WorkspaceSwitcher + Nav + UserMenu (3-tier)
- `src/components/app/sidebar-workspace-switcher.tsx` — dropdown pattern (Phase 2.6 P2 base exists)
- `src/app/[locale]/app/layout.tsx:48-52` — header with `NotificationBell` only (Phase 2.6 P4 PageHelpLink slot available)
- **G6 does NOT modify these** — Phase 2.6 territory. But `/settings/profile` edit lives inside this shell.

---

## 2. 새로 만들어야 할 것

### New route (2)
1. `src/app/u/[handle]/page.tsx` — **locale-free** public profile page
   - Avatar, display name, role badge (Creator/Studio/Observer)
   - Bio (200 chars max, markdown: bold/italic/link only — minimal pipeline per G3 decision)
   - Instagram link + up to 3 external links
   - Submissions grid (aggregation: all user's submissions across all challenges, public only)
   - "Edit profile" button visible to owner only
2. `src/app/u/[handle]/not-found.tsx` — handle not found (mirror showcase pattern)
3. `src/app/u/layout.tsx` — minimal locale bridge if needed

### Modified route
- `src/app/[locale]/app/settings/page.tsx` OR carve out `src/app/[locale]/app/settings/profile/page.tsx` — extend profile form
  - New fields: instagram_handle, up to 3 external_links (array)
  - Bio 200-char cap (was bio exists? verify), avatar upload now goes through G1-migrated schema
  - Handle change 90-day lock (read `handle_changed_at`)

### New Server Actions
- Extend `src/app/[locale]/app/settings/actions.ts`:
  - `updateProfileExtendedAction` — handles instagram + external_links + 90-day handle lock

### New lib
- `src/lib/profile/queries.ts` — `getProfileByHandle(handle)` with submission aggregation JOIN
- Reuse `src/lib/handles/validation.ts` (built in G2)

### Middleware patch (SPEC §3 G6 Task 1)
```diff
- "/((?!api|_next|_vercel|auth/callback|showcase|challenges|.*\\..*).*)"
+ "/((?!api|_next|_vercel|auth/callback|showcase|challenges|u|.*\\..*).*)"
```
One-line. Verified pattern (Phase 2.1 G6 precedent: commit 5855dd0).

### Image processing (avatar crop)
- SPEC G6 Task 3: "max 2MB, client-side crop to 512×512 JPEG"
- No existing avatar-crop primitive in codebase
- Options:
  - `react-image-crop` (maintained, accessible)
  - Native `<canvas>` + drag handles (zero dep, but non-trivial code)
- Recommendation: `react-image-crop` (small dep, well-trodden)

---

## 3. SPEC vs 현실 drift (의심점)

### Handle validation divergence (cross-ref G2)
- Current `settings/profile-form.tsx:19` allows 2-40 chars, lowercase+numbers+`_` (NO dash)
- Current `onboarding/profile/page.tsx:18` allows 3-30 chars, lowercase+numbers+`-`+`_` (WITH dash)
- SPEC §3 G2 Task 3 says 3-30, lowercase+numbers+`_` (NO dash)
- G2 fix is prerequisite — G6 reuses unified validation. Confirm G2 lands first.

### Handle change 90-day lock is new plumbing
- SPEC §3 G2 Task 6: "once per 90 days"
- `profiles.handle_changed_at` column added in G1 migration (commit 58dbf6e)
- No code reads/writes this column yet
- G6 form must:
  - Disable handle field if `now() - handle_changed_at < interval '90 days'`
  - Server Action: validate rate limit, stamp `handle_changed_at` on change
- **Cross-ref G2:** should G2 also wire this? SPEC puts it in G2. If G2 lands handle validation without rate-limit UX, G6 re-visits. Decision: do 90-day lock logic in G2 to match SPEC, or defer to G6? Recommend G2.

### Old handles reserved 30 days (SPEC §6 Q7)
- After handle change, old handle should be held for 30 days
- **No table for held handles exists.** Options:
  - New table `handle_holds (handle citext, held_until timestamptz)` — DB-level guarantee
  - Reuse `profiles.handle` history (but profiles is 1:1 with user — no history)
- MVP simplest: new `handle_holds` table, small migration in G6
- Or defer enforcement to Phase 2.6 — SPEC is a proposal not a requirement

### Submissions grid requires cross-challenge aggregation
- Query: `SELECT cs.* FROM challenge_submissions cs JOIN challenges c ON cs.challenge_id = c.id WHERE cs.submitter_id = $1 AND c.state != 'draft' ORDER BY cs.created_at DESC`
- RLS: public SELECT on challenge_submissions (G1) + state-filtered SELECT on challenges (G1) — both align. ✅
- No realtime on profile (SPEC doesn't mandate) — SSR query sufficient

### Avatar upload edge cases
- 2MB cap enforced client-side (compression via canvas) — need `src/lib/avatar/crop.ts` or similar
- If upload exceeds bucket limit (Supabase Free: 50MB default), no issue for 2MB target
- Existing Phase 1.1 `avatars` bucket file_size_limit — check current setting. If unbounded, fine. If already 2MB, fine. If set higher, no issue.

### PRE-1 impact on G6
- Role badge render: reads `profiles.role` → 'creator' / 'studio' / 'observer'
- **Does NOT touch `user_roles.role`** → no PRE-1 collision in G6 UI logic
- ✅ G6 role display uses `profiles.role` exclusively

### Cross-ref 4 web Claude findings
- Sidebar / workspace-switcher / header shell findings = Phase 2.6 P1/P2/P4 partial
- G6 **must not** modify sidebar.tsx, sidebar-workspace-switcher.tsx, or app layout header
- Phase 2.6 SPEC v1 (web Claude in progress) owns these
- G6 scope strictly: `/u/<handle>` + `/settings/profile` form fields + middleware matcher

---

## 4. 외부 의존 / ENV prereq

- No new ENV vars.
- New dep candidate: `react-image-crop` (~30KB gzip). Confirm before adding.

---

## 5. 테스트 전략 권고

| Layer | Scope | Pattern |
|---|---|---|
| Unit | Handle 90-day lock math | vitest |
| Unit | Instagram handle regex | `.mjs` |
| Unit | External-link URL validation | vitest |
| Integration | RLS: public can SELECT any profile by handle | Direct supabase anon client |
| Integration | Cross-challenge submissions aggregation query | Asserting row structure |
| E2E | `curl http://localhost:3003/u/known-handle` → 200 with profile data | Bash smoke |
| E2E | `curl .../u/nonexistent` → 404 via custom not-found | Bash smoke |
| E2E | Middleware: `/u/test` does NOT redirect to `/ko/u/test` or `/en/u/test` | Bash smoke |
| Visual | Profile page vs X1 compliance (primitives, tokens) | Agent re-audit |
| Manual QA | Owner vs non-owner view of same profile (edit button presence) | YAGI-MANUAL-QA-QUEUE |

---

## 6. 잠재 야기 결정 항목

1. **Handle holds table** — new `handle_holds` table for 30-day squatter protection, or defer to Phase 2.6? Recommend: MVP no table; log change events via `profiles.handle_changed_at` only. Old handle becomes insertable again after 90 days if no one claimed — good enough for MVP.
2. **Image crop dep** — adopt `react-image-crop` or hand-roll? Recommend adopt.
3. **Locale-free `/u` route** — confirmed per showcase pattern? Final answer needed to exclude from middleware correctly.
4. **Profile edit scope** — all fields in one form (current pattern), or split sections (basic/social/bio)? MVP: single form.
5. **Empty submissions state** — user with no submissions shows what? "아직 참여한 챌린지가 없습니다" Korean copy or bilingual?
6. **Role switch UI** — Observer → Creator upgrade (SPEC §1 allows free): lives in `/settings/profile` or separate `/settings/role`? Recommend separate to avoid accidental downgrade.

---

**Cross-ref:** G2 handle validation unification is a prerequisite. Sidebar/header findings from web Claude are Phase 2.6 scope, not G6. PRE-1 role collision does NOT surface in G6 (reads profiles.role only).
