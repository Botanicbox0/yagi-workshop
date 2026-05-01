# Wave C.5b sub_13 — Artist demo account (BLOCKED on Phase 5 migration)

**Status**: ⛔ NOT created. Halt + chat-report per yagi spec.

## Spec recap

yagi-locked spec for the demo Artist account:

- email: `artist@yagiworkshop.xyz`
- password: `yagiworkshop12#$`
- role: `artist` (PRODUCT-MASTER §4 / DECISIONS Q-094 persona model)
- purpose: test/demo account in advance of the Phase 5 Artist Roster
  intake surface

## Pre-flight result (2026-05-01)

The current `public.profiles.role` column is plain `text` with a CHECK
constraint:

```sql
profiles_role_check  CHECK (
  (role IS NULL) OR
  (role = ANY (ARRAY['creator','studio','observer','client']))
)
```

The constraint does **not** include `'artist'`. Inserting a profile
row with `role='artist'` would raise `check_violation 23514`.

Per the Wave C.5b prompt:

> 'artist' 가 없으면 야기에게 chat 보고 (Phase 5 의 Artist workspace
> 작업 의존성).

That branch is now active. Builder did NOT create the account.

## What was committed

`scripts/create-artist-account.ts` is authored and committed. It:

- Imports `createClient` from `@supabase/supabase-js`.
- Reads `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` from
  env (yagi runs with `.env.local`).
- Calls `supabase.auth.admin.createUser({ email, password,
  email_confirm: true, user_metadata: { display_name } })`.
- Idempotent: if the auth user already exists, looks up the id and
  upserts the profile.
- Catches `profiles_role_check` violations with an explicit error
  pointing at this followup so the failure mode is unambiguous.

To execute once Phase 5 widens the CHECK:

```powershell
$env:NEXT_PUBLIC_SUPABASE_URL = "https://jvamvbpxnztynsccvcmr.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "<from .env.local>"
npx tsx scripts/create-artist-account.ts
```

## Path to unblock

Phase 5 entry migration must:

1. ALTER the `profiles_role_check` constraint to include `'artist'`.
2. Codex K-05 review (mandatory per CLAUDE.md §"Database write
   protocol") since this is a CHECK widening on a live table.
3. Apply via `supabase db push --linked`.
4. Run `scripts/create-artist-account.ts` to bootstrap the demo
   account.

Verify after run:

```sql
SELECT id, email, raw_user_meta_data->>'display_name' AS dn
FROM auth.users WHERE email = 'artist@yagiworkshop.xyz';

SELECT id, role, display_name FROM public.profiles
WHERE id = (SELECT id FROM auth.users WHERE email = 'artist@yagiworkshop.xyz');
```

## Why not bootstrap with role=NULL or role='client' now

Both are reversible workarounds, but each carries a real risk:

- `role=NULL` — the legacy onboarding redirect resolver (now in
  `lib/onboarding/role-redirects.ts` after sub_01 simplification)
  treats null role as "not yet onboarded" and bounces to
  /onboarding/workspace. Not what an Artist demo account should
  experience.
- `role='client'` — would make the Artist account behave exactly like
  a Brand client; defeats the point of having a demo account ahead
  of the Artist surface design. Also creates an audit-trail issue
  (a row that was 'client' at create-time then later flipped to
  'artist' is harder to interpret than one created cleanly).

The cleanest path is to wait for Phase 5's migration. yagi spec
explicitly chose halt over compromise — recorded.

**Registered**: 2026-05-01 (Wave C.5b sub_13)
