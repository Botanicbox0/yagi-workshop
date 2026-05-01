# Wave C.5b amend_01 — Migration apply + functional test log

**Migration**: `supabase/migrations/20260501095935_phase_4_x_auto_profile_on_signup.sql`
**Applied**: 2026-05-01 via Supabase MCP `apply_migration` (recorded as
`schema_migrations.version = 20260501095935`).
**Layer 1 self-review**: `_amend01_self_review.md` — 0 HIGH-A residual.
**Layer 2 (yagi + this-chat)**: review summary delivered to chat;
proceeding under the protocol's `0 HIGH-A → apply` branch.

## Apply verification

| Check | Result |
|---|---|
| `pg_proc` has `handle_new_user` | ✅ 1 row |
| `pg_trigger` has `on_auth_user_created` (non-internal) | ✅ 1 row |
| `prosecdef` (SECURITY DEFINER) | ✅ true |
| `proconfig` settings | ✅ `search_path=public` |
| `schema_migrations` row | ✅ version 20260501095935 |
| security advisor regression introduced by handle_new_user | ✅ 0 (REVOKE EXECUTE suppresses anon/authenticated SECURITY-DEFINER lints; SET search_path suppresses search-path-mutable lint) |

## Test 1 — new auth.users INSERT triggers profile creation

```sql
INSERT INTO auth.users (id, instance_id, aud, role, email,
                       encrypted_password, email_confirmed_at,
                       raw_app_meta_data, raw_user_meta_data,
                       created_at, updated_at)
VALUES (
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid,
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'test-amend01@yagiworkshop.xyz',
  crypt('disposable-pwd', gen_salt('bf')),
  now(), '{"provider":"email"}'::jsonb, '{}'::jsonb,
  now(), now()
);
```

Resulting profile row (read via direct SELECT):

| field | observed |
|---|---|
| `handle` | `c_0d71a925` |
| `display_name` | `test-amend01` |
| `role` | `client` |
| `locale` | `ko` |

✅ Matches Layer 1 self-review F1, F2, F8, F10 expectations.

## Test 3 — existing user profiles untouched

The 3 pre-amend_01 profile rows (yagi, yonsei, yout40204020) all
untouched after the trigger apply. Audit confirms:

| user | handle | role | preserved? |
|---|---|---|---|
| yagi (id 5428a5b9...) | `yagi` | NULL | ✅ |
| yonsei (id 73be213d...) | `handle` | `creator` | ✅ (will reclassify in amend_03) |
| yout40204020 (id 52506e01...) | `c_a2df55bf` | `client` | ✅ |

## Cleanup

```sql
DELETE FROM auth.users
WHERE id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid
RETURNING id, email;
-- → returned 1 row
SELECT count(*) FROM public.profiles
WHERE id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid;
-- → 0 (FK ON DELETE CASCADE removed the profile)
```

## Acceptance

- [x] Migration applied + verified.
- [x] Layer 1 self-review 0 HIGH-A.
- [x] Test 1 PASS — handle / display_name / role / locale all match.
- [x] Test 3 PASS — existing profiles unaffected.
- [x] Test 2 (collision retry) SKIPPED per spec — md5 collisions
      sub-astronomical for the 8-char prefix; loop bound is upheld
      via the `IF v_attempt > 5 THEN RAISE` defense.
- [x] No new security advisor warnings introduced.
