# Wave C.5b amend_02 — Reviewer Fallback Layer 1 (Opus 4.7 self-review, adversarial)

**Target**: `supabase/migrations/20260501100000_phase_4_x_widen_profile_role_enum.sql`
plus the immediate downstream action — running
`scripts/create-artist-account.ts` after apply.

**Frame**: same as amend_01. Adversarial frame, severity scale per
`CODEX_TRIAGE.md`, target = 0 HIGH-A residual before Layer 2.

## Findings

### F1 — Additive-only verification

- **Surface**: `DROP CONSTRAINT IF EXISTS profiles_role_check; ADD CONSTRAINT
  ... CHECK ((role IS NULL) OR (role = ANY (ARRAY['creator','studio',
  'observer','client','artist'])))`.
- **Question**: do all existing `profiles.role` values pass the new
  constraint? Are we silently invalidating any row?
- **Live audit (2026-05-01)**:
  - `role = 'creator'` — 1 row (yonsei test account). Passes new CHECK.
  - `role = 'client'` — 1 row (yout40204020). Passes.
  - `role IS NULL` — 1 row (yagi). Passes.
  - `role = 'studio' / 'observer' / 'artist'` — 0 rows. Trivially ok.
- **Atomicity**: Postgres applies `ADD CONSTRAINT` with an ACCESS
  EXCLUSIVE lock on `profiles`. Brief blocking; profiles is small
  (~3 rows currently). The `DROP IF EXISTS` makes the migration
  re-runnable.
- **Verdict**: PASS. Additive only.
- **Severity**: none.

### F2 — RLS / policy implicit dependence on role enum

- **Surface**: `creators_update_self`, `studios_update_self` policies
  filter by `p.role = 'creator'` / `p.role = 'studio'` literals.
- **Question**: does adding 'artist' to the enum cause an unintended
  RLS bypass via these policies?
- **Verdict**: NO. Both policies use literal-string equality, NOT the
  enum membership check. Adding 'artist' has no effect on whether a
  row matches `p.role = 'creator'` (it doesn't). Phase 5 will likely
  introduce an `artists_update_self` policy with `p.role = 'artist'`
  literal in the same shape.
- **Severity**: none.

### F3 — handle_new_user (amend_01) interaction

- **Surface**: amend_01's trigger inserts new profiles with
  `role = 'client'` (literal). Wide enum changes nothing for the
  trigger path.
- **Verdict**: no interaction. The trigger keeps the persona-A default;
  the artist bootstrap script (sub_13) UPSERTs over the row to flip
  role to 'artist' afterward. See F5.
- **Severity**: none.

### F4 — `validate_profile_role_transition` semantics on artist UPSERT

- **Surface**: Existing trigger blocks self-transitions (auth.uid() =
  NEW.id) from `client → other` and `non-NULL → NULL`. The artist
  bootstrap runs the script with the service-role key.
- **Question**: when the script's `supabase.from('profiles').upsert(...)`
  fires on the row that handle_new_user just created (role='client'),
  does the trigger reject the UPDATE to role='artist'?
- **Verdict**: NO. Inside the function: `v_caller := auth.uid(); IF
  v_caller IS NULL THEN RETURN NEW;`. The service-role context has
  NULL `auth.uid()` (not bound to any session user). The trigger's
  early-return short-circuits all role-transition checks. Verified
  by reading the function body (`pg_get_functiondef`).
- **Severity**: none.

### F5 — sub_13 script UPSERT order interaction

- **Sequence** (per amend_01 self-review F8):
  1. `supabase.auth.admin.createUser({ email, password, email_confirm,
     user_metadata })` → `auth.users` INSERT.
  2. `handle_new_user` AFTER INSERT trigger fires → `profiles` row
     created with `role='client'`, `display_name='artist'` (email
     local-part), `handle='c_<md5>'`, `locale='ko'`.
  3. Script's `supabase.from('profiles').upsert({ id, handle:
     'artist_demo_<6chars>', display_name: 'Artist Demo', role:
     'artist', locale: 'ko' })` → ON CONFLICT (id) → UPDATE.
- **Question**: does the upsert's `handle` value pass the
  `profiles_handle_check` regex (`^[a-z0-9_-]{3,30}$`)?
- **Verdict**: `artist_demo_<6chars>` = 7 + 6 = 13 chars, all in the
  allowed set. PASS. Also UNIQUE-safe (md5-derived, won't collide
  with the c_<md5> handle the trigger wrote).
- **Verdict**: does the upsert's `display_name = "Artist Demo"`
  contain a space? Looking at the schema, `display_name` is plain
  text NOT NULL with no CHECK constraint on character set. Spaces
  are fine. PASS.
- **Severity**: none.

### F6 — TypeScript ProfileRole type drift

- **Surface**: `src/lib/app/context.ts:15`:
  `export type ProfileRole = "creator" | "studio" | "observer" | "client";`
- **Question**: does runtime now produce values outside this type
  (artist account row served as part of AppContext)?
- **Verdict**: YES. After widening + bootstrap, `profiles.role` can
  be `'artist'` for the demo account row. The TypeScript type must
  include 'artist' or any code casting it (`profile.role as ProfileRole`)
  will silently land on an unrecognised string at runtime. The
  application's role-switching code paths (`role === 'creator'` etc)
  fall through to the else branch for unknown roles, but the type
  drift is still a Tier-1 lint hygiene issue.
- **Severity**: HIGH-B (high-impact lint hygiene; not security but
  type-safety regression). **Auto-fixable** by appending `| "artist"`
  to the union. Will fix as part of amend_02 commit.

### F7 — Phase 5 entry artist work — does this lock-in?

- **Question**: Phase 5 will introduce Artist Roster intake. Will the
  enum already including 'artist' cause Phase 5's migration to be
  no-op or silently stale?
- **Verdict**: NO. Phase 5 work will be:
  - A dedicated Artist intake UI surface (curated, invite-token
    based per FU-C5b-01).
  - Likely an `artist_profiles` child table (analogous to
    `creators` / `studios`) for artist-specific fields.
  - RLS policies for that new table.
  - Possibly a `workspaces.kind='artist'` extension if the artist
    has a workspace-shaped surface.
  None of these depend on the enum being absent today; they all
  layer on top of `role='artist'` already being valid. The enum
  widening here is the *prerequisite*, not the deliverable.
- **Severity**: none.

### F8 — `is_yagi_admin` / `is_ws_admin` interaction

- **Surface**: helper functions check `user_roles` table, not
  `profiles.role`. They are independent of this CHECK constraint.
- **Verdict**: no interaction.
- **Severity**: none.

### F9 — Constraint replace atomicity / rollback safety

- **Surface**: `DROP IF EXISTS ... ADD CONSTRAINT ...` runs as a
  multi-statement migration body. If the ADD fails (e.g. validation
  finds a row outside the new enum), the entire migration rolls
  back — but the DROP would be reverted too, leaving the OLD
  constraint intact.
- **Verdict**: actually, the apply_migration MCP tool wraps the body
  in a transaction. The DROP + ADD pair is atomic. If the ADD fails
  validation, both statements roll back. Safe.
- **Severity**: none.

### F10 — RPC / server-action role checks

- **Surface**: server actions in `src/app/[locale]/app/projects/new/actions.ts`
  and elsewhere reference role values. Most paths use the actor_role
  classification system (`is_valid_transition`'s actor_role:
  client/yagi_admin/workspace_admin/system) which routes through
  `user_roles` table, NOT `profiles.role`.
- **Verdict**: no role-string consumer in server-side code paths
  treats the enum as closed-world. Adding 'artist' is graceful.
- **Severity**: none.

## Verdict — 0 HIGH-A residual

- HIGH-A: none.
- HIGH-B: F6 (TypeScript ProfileRole type drift). **Auto-fix**:
  append `| "artist"` to the union in `src/lib/app/context.ts`.
  Fixed as part of amend_02 commit.
- MED-A/B/C: none.
- LOW: F1 atomicity blip — sub-100ms ACCESS EXCLUSIVE on a 3-row
  table is invisible at this fleet size.

Layer 1 verdict: PASS. Recommend Layer 2 review focusing on:
- F6 type fix (will it silently break any consumer that switch-
  exhausts on ProfileRole? Answer: no — TypeScript narrowing on a
  widened union still treats unknown branches as `never`-ish, but
  any `switch (role)` with no default would lose exhaustiveness
  inference; quick grep on the codebase shows zero such switches).
- F4 service-role-vs-trigger ordering (verified live).
