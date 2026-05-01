# Phase 4.x — Wave C.5b post-rollback amendments result

**Window**: 2026-05-01 (lead Builder direct, no spawn)
**Branch**: `g-b-9-phase-4` (NOT pushed; NOT ff-merged to main)
**HEAD before amendments**: `5cacf22` (sub_00 ROLLBACK)
**HEAD after amend_04**: `12e8c95`
**Verify**: `pnpm exec tsc --noEmit` exit 0 / `pnpm lint` baseline-pinned
(3155 errors, identical to Wave C.5a baseline) / `pnpm build` exit 0

---

## Amend summary (4 amends, 5 functional commits + this doc)

| amend | Subject | Commit | Acceptance |
|---|---|---|---|
| 01 | Profile auto-create DB trigger | `5105033` | ✅ migration applied; SECURITY DEFINER + search_path locked; Test 1 (synthetic INSERT) + Test 3 (existing rows preserved) PASS; advisor 0 new |
| 02a | profiles_role_check widened to include 'artist' | `e0400d4` | ✅ migration applied; constraint includes 'artist'; ProfileRole TS type extended; sidebar switch case added |
| 02b | artist demo account bootstrap (sub_13 unblocked) | `d1d5af1` | ✅ artist@yagiworkshop.xyz / role=artist / handle=artist_demo_2d6a3f / email_confirmed |
| 03 | yonsei legacy 'creator' → 'client' reclassify | `8dd711f` | ✅ 1 row updated; final distribution artist 1 / client 2 / NULL 1 / 0 of {creator, studio, observer} |
| 04 | brand-onboarding-step rework registered as FU-C5b-08 | `12e8c95` | ✅ followup logged with 3 options + recommendation (c); no code change |

---

## amend_01 — Profile auto-creation DB trigger

**Migration**: `supabase/migrations/20260501095935_phase_4_x_auto_profile_on_signup.sql`

Closes the dangling profile-creation path that sub_01 introduced when
it deleted the `/onboarding/role` flow + `completeProfileAction`. New
auth.users INSERT now triggers `public.handle_new_user()` SECURITY
DEFINER trigger function that materialises a profiles row in the
same transaction.

Field defaults:
- `handle` = `c_<8-char-md5(uuid+email+attempt)>` — matches the
  `^[a-z0-9_-]{3,30}$` constraint exactly. Up to 6 attempts before
  raising; collisions sub-astronomical at this fleet size.
- `display_name` = email local-part with hardened fallback for
  empty / NULL email (`'@example.com'` → `'user'`, never empty).
- `role` = `'client'` per persona A (DECISIONS Q-094).
- `locale` = `raw_user_meta_data->>'locale'` coerced to `'ko'|'en'`.

Hardening:
- `SET search_path = public` closes the SECURITY DEFINER hijack
  vector via `pg_temp` shadowing.
- `REVOKE EXECUTE FROM PUBLIC, authenticated, anon` — defense in
  depth against forged direct invocation.
- `ON CONFLICT (id) DO NOTHING` for idempotency.

Reviewer Fallback Layer 1 (Codex absent, Opus 4.7 self-review): 11
findings audited, 0 HIGH-A. Layer 2 (yagi + this-chat) implicitly
PASS via the protocol's `0 HIGH-A → apply` branch. Full audit in
`_amend01_self_review.md`.

Functional test (synthetic auth.users INSERT, observe trigger output,
DELETE → CASCADE cleanup): all field values matched expectations.
Test log in `_amend01_test_log.md`.

---

## amend_02 — Artist enum widening + demo account bootstrap

**Migration**: `supabase/migrations/20260501100806_phase_4_x_widen_profile_role_enum.sql`

Pulled forward from Phase 5 entry. `profiles_role_check` widened to
include `'artist'`. Additive only — all existing rows pass. No RLS
or RPC consumer treats the role enum as closed-world; the change
is semantically a no-op for existing flows and a prerequisite for
the demo account.

TypeScript ProfileRole union extended with `"artist"` (HIGH-B fix
from self-review F6); sidebar switch case added so the dropdown
header shows "Artist" for the demo account.

Reviewer Fallback Layer 1: 10 findings audited, 0 HIGH-A residual,
1 HIGH-B auto-fixed in the same commit. Full audit in
`_amend02_self_review.md`.

**Bootstrap result** (`scripts/create-artist-account.ts` executed
via `npx tsx`):

```
[artist-account] created user_id=2d6a3f6f-cd69-4425-93b6-bebd9f4cf434 role=artist
```

Live verification (auth.users + profiles join):

| field | value |
|---|---|
| auth.users.id | `2d6a3f6f-cd69-4425-93b6-bebd9f4cf434` |
| auth.users.email | `artist@yagiworkshop.xyz` |
| email_confirmed | `true` |
| profile.handle | `artist_demo_2d6a3f` |
| profile.display_name | `Artist Demo` |
| profile.role | `artist` |
| profile.locale | `ko` |

**Trigger ↔ script ordering verified live**:
1. `auth.admin.createUser` → auth.users INSERT
2. `handle_new_user` AFTER INSERT → profile inserted role='client', handle='c_<md5>'
3. Script's service-role upsert → ON CONFLICT (id) UPDATE → role='artist', handle='artist_demo_2d6a3f'
4. `validate_profile_role_transition` short-circuits at `auth.uid() IS NULL` (service-role context)

Login test instructions in `_artist_account_created.md`.

---

## amend_03 — Yonsei creator → client reclassify

Re-audit confirmed only 1 row with `role IN ('creator','studio')`:
yagi's yonsei test account `73be213d-1306-42f1-bee4-7b77175a6e79`.
No surprises requiring chat-report. yagi-locked Option A applied
via service-role:

```sql
UPDATE public.profiles
SET role = 'client', updated_at = now()
WHERE id = '73be213d-1306-42f1-bee4-7b77175a6e79';
```

The companion `creators` row left in place (RLS now denies the
owner since profile.role != 'creator', no UI consumer post-sub_02,
forensic value preserved).

Final role distribution:

| role | count |
|---|---|
| `artist` | 1 |
| `client` | 2 |
| NULL | 1 |
| `creator` | 0 |
| `studio` | 0 |
| `observer` | 0 |

Audit log in `_wave_c5b_sub10_db_audit.md` (amend_03 follow-up
section).

---

## amend_04 — Brand onboarding followup

`/onboarding/brand` step flagged as Phase 2.x multi-brand-agency
leftover by yagi visual review. yagi-locked: register only, fix
later. FU-C5b-08 added to `_followups.md` with 3 options + chat-
recommended option (c): delete the route, auto-create default
brand at workspace bootstrap, move multi-brand management into
`/app/settings/workspace`.

Picked up at Phase 4.x ff-merge → hotfix-1 OR Phase 5 entry IA
cleanup.

---

## Verify

```
pnpm exec tsc --noEmit  → exit 0
pnpm lint               → exit 1 baseline (3155 errors, identical to Wave C.5a)
pnpm build              → exit 0 (Compiled successfully; middleware 161 kB)
```

Lint baseline drift: 0. The HIGH-B TypeScript ProfileRole drift
flagged in amend_02 self-review F6 was fixed in the same commit
(amend_02a) so no transient lint regression appeared.

Schema migrations recorded:

```
20260501095935  phase_4_x_auto_profile_on_signup
20260501100806  phase_4_x_widen_profile_role_enum
```

Both filenames in `supabase/migrations/` were renamed to match the
timestamps Supabase MCP assigned at apply time so future
`supabase db push --linked` does not re-attempt them.

---

## Visual review checklist for yagi (post-amendments)

When `pnpm dev` resumes:

- [ ] Sign up at `/ko/signup` with a fresh email. After email
      confirm + `/auth/callback` → `/ko/onboarding/workspace`,
      open Supabase Dashboard → `public.profiles` and confirm a
      row was auto-created (handle `c_<md5>`, role='client',
      display_name=email-local-part).
- [ ] Sign in at `/ko/signin` with `artist@yagiworkshop.xyz` /
      `yagiworkshop12#$`. Should land on `/ko/onboarding/workspace`
      (artist account has no workspace_members row; Phase 5 entry
      will introduce a non-workspace landing surface). Sidebar
      user-menu badge should read "Artist".
- [ ] No `creator` / `studio` profile rows visible anywhere in the
      app surfaces.
- [ ] All Wave C.5b sub_03..12 surfaces still render correctly on
      the post-rollback light editorial canvas (this is a
      regression check; nothing changed there in amendments).

---

## Followups status snapshot

| ID | Status |
|---|---|
| FU-C5b-01 (Phase 5 Artist Roster intake) | open — demo account exists but curated intake flow is Phase 5 |
| FU-C5b-02 (Supabase Dashboard email template paste) | open — yagi action |
| FU-C5b-03 (Phase 7+ "+50개 이상" placeholder → real client logos) | open |
| FU-C5b-04 (Redaction font self-host) | open |
| FU-C5b-05 (border-border sweep) | ✅ closed (sub_00 ROLLBACK obsolete) |
| FU-C5b-06 (Supabase Dashboard redirect URLs allowlist) | open — yagi action |
| FU-C5b-07 (dark editorial canvas as future option) | open — deferred indefinitely |
| FU-C5b-08 (brand onboarding step rework) | open — Phase 4.x hotfix-1 or Phase 5 |

---

## STOP — Wave D not entered

Wave C.5b post-rollback amendments are COMPLETE per the prompt's
STOP point. **Wave D is NOT entered**. yagi must:

1. Re-walk every surface from the post-rollback visual checklist
   plus the amendment additions above.
2. Sign in as `artist@yagiworkshop.xyz` to confirm the demo flow.
3. Decide between Wave C.5c (more fixes) or Wave D (K-05 + manual
   SQL verify + browser smoke + ff-merge).
4. Trigger the chosen wave via Telegram / chat — Builder will not
   self-trigger.

`push 절대 X. ff-merge 절대 X.` (L-027 BROWSER_REQUIRED gate)
