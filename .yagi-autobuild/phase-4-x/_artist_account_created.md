# Wave C.5b sub_13 + amend_02 — Artist demo account (CREATED)

**Status**: ✅ Created 2026-05-01 via `scripts/create-artist-account.ts`
after Wave C.5b amend_02 widened `profiles_role_check` to include
`'artist'`.

## Spec recap

yagi-locked spec for the demo Artist account:

- email: `artist@yagiworkshop.xyz`
- password: `yagiworkshop12#$`
- role: `artist` (PRODUCT-MASTER §4 / DECISIONS Q-094 persona model)
- purpose: test/demo account for yagi visual review ahead of the
  Phase 5 Artist Roster intake surface design

## Pre-flight (after amend_02)

After Wave C.5b amend_02 (commit pending), the
`profiles_role_check` constraint reads:

```sql
CHECK ((role IS NULL) OR
       (role = ANY (ARRAY['creator','studio','observer','client','artist'])))
```

`'artist'` is a permitted value. Path-to-unblock from the original
sub_13 halt log is satisfied.

## Bootstrap result

```
> npx tsx scripts/create-artist-account.ts
[artist-account] created user_id=2d6a3f6f-cd69-4425-93b6-bebd9f4cf434 role=artist
```

Live verification (joined `auth.users` + `public.profiles`):

| field | value |
|---|---|
| auth.users.id | `2d6a3f6f-cd69-4425-93b6-bebd9f4cf434` |
| auth.users.email | `artist@yagiworkshop.xyz` |
| auth.users.email_confirmed | `true` |
| auth.users.raw_user_meta_data.display_name | `Artist Demo` |
| profiles.handle | `artist_demo_2d6a3f` |
| profiles.display_name | `Artist Demo` |
| profiles.role | `artist` |
| profiles.locale | `ko` |

## Trigger / script ordering verification

This account exercises the `handle_new_user` (amend_01) ↔ sub_13
script interaction documented in amend_01 self-review F8 and
amend_02 self-review F4/F5:

1. `auth.admin.createUser` → `auth.users` INSERT.
2. `handle_new_user` AFTER INSERT trigger fires → profile row
   inserted with `role='client'` (default per persona A),
   `handle='c_<md5>'`, `display_name='artist'` (email local-part),
   `locale='ko'`.
3. Script's `supabase.from('profiles').upsert({...})` runs as
   service-role → ON CONFLICT (id) → UPDATE. `role` flips to
   `'artist'`, `handle` to `'artist_demo_2d6a3f'`,
   `display_name` to `'Artist Demo'`.
4. `validate_profile_role_transition` trigger fires on the UPDATE
   but short-circuits at `IF auth.uid() IS NULL THEN RETURN NEW`
   (service-role context has no session uid). Allows
   client → artist transition.

Net result: account is `role='artist'` end-to-end with the
expected handle / display_name / locale.

## Login test

yagi can sign in at `/ko/signin` with:

- email: `artist@yagiworkshop.xyz`
- password: `yagiworkshop12#$`

Post-signin, the user lands on `/onboarding/workspace` because the
artist account has no `workspace_members` row. Phase 5 entry will
introduce a curated Artist intake / workspace bootstrap path; for
Wave C.5b visual review this bounce is expected (not a bug).

## Artifacts

- `scripts/create-artist-account.ts` — unchanged from sub_13 commit.
- `supabase/migrations/20260501100806_phase_4_x_widen_profile_role_enum.sql` — committed in amend_02a.
- `_amend02_self_review.md` — Layer 1 review pre-apply.
- This file — bootstrap result log.

## Followups

- FU-C5b-01 (Phase 5 Artist Roster intake surface) remains open. The
  demo account now exists for visual review but the curated intake
  flow it stands in for is still a Phase 5 deliverable.
- The /[locale]/app/layout.tsx workspace-required redirect treats
  any non-`client` role with no workspace as needing onboarding. For
  the demo account this means /ko/app/* surfaces are not directly
  reachable until Phase 5 either grants the artist a workspace or
  carves a non-workspace landing surface. Worth noting for yagi
  during visual review.
