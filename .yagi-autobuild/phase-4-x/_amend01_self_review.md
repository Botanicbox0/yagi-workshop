# Wave C.5b amend_01 — Reviewer Fallback Layer 1 (Opus 4.7 self-review, adversarial)

**Target**: `supabase/migrations/20260501100000_phase_4_x_auto_profile_on_signup.sql`

**Frame**: act as a security-minded reviewer auditing a SECURITY DEFINER
trigger that runs on `auth.users INSERT`. Goal: 0 HIGH-A residual before
Layer 2 (yagi + this-chat) and migration apply. Severity scale per
`.yagi-autobuild/CODEX_TRIAGE.md`: HIGH-A = security-critical /
auto-fixable; HIGH-B = high-impact bug; HIGH-C = non-auto; MED-A/B/C
auto/defer/non-auto; LOW.

## Findings

### F1 — SECURITY DEFINER + search_path injection vector

- **Surface**: `SET search_path = public` plus the `md5(NEW.id::text ||
  COALESCE(NEW.email, '') || v_attempt::text)` concatenation.
- **Question**: can a malicious email like `bobby@example.com'; DROP TABLE
  profiles; --` slip through?
- **Verdict**: NO. `md5(text)` returns 32 hex chars; the entire
  concatenated payload becomes input to a hash function, not a SQL
  fragment. There is no dynamic SQL (no `EXECUTE format(...)` /
  string-interpolated query). Even if `NEW.email` contained a payload,
  it never reaches the parser as code; only as data inside the md5 call.
- **search_path** is locked to `public`, blocking the standard SECURITY
  DEFINER hijack where an unprivileged user creates `pg_temp.profiles`
  and the function resolves the bare table name there. The function
  also references `public.profiles` qualified, doubly safe.
- **Severity**: none.

### F2 — citext cast silent-fail risk

- **Surface**: `('c_' || ...)::citext`.
- **Question**: can the cast silently produce an invalid handle?
- **Verdict**: NO. md5 returns `[a-f0-9]{32}`; substr to 8 chars stays
  in `[a-f0-9]{8}`; prefixed `c_<8 hex>` matches the
  `profiles_handle_check` regex `^[a-z0-9_-]{3,30}$` exactly (10 chars,
  all in [a-z0-9_-]). Cast to citext is a wrapper, not a transform —
  the string content is preserved. If the constraint somehow rejected
  the value, the INSERT would raise `check_violation` which would roll
  back the transaction including auth.users — visible failure, not
  silent.
- **Severity**: none.

### F3 — Retry loop bound

- **Surface**: `LOOP ... v_attempt := v_attempt + 1; IF v_attempt > 5
  THEN RAISE; END IF; END LOOP`.
- **Question**: infinite loop? off-by-one?
- **Verdict**: 6 distinct attempts (v_attempt values 0..5 yield handle
  variants; on the 7th iteration the increment makes v_attempt=6 which
  trips `> 5` and raises). md5 collision space for 8 hex chars is
  ~16M; with the user's uuid+email+attempt mixed in, a collision in 6
  attempts is sub-astronomical. The spec comment says "5-attempt retry"
  but the actual count is 6 — purely cosmetic, the bound holds.
- **Severity**: LOW (comment/code count discrepancy in commit message;
  not in the SQL file itself, which omits the count).

### F4 — Handle UNIQUE race between SELECT and INSERT

- **Surface**: `EXIT WHEN NOT EXISTS (SELECT 1 ... WHERE handle =
  v_handle)` then later `INSERT ...`.
- **Question**: can a concurrent transaction insert the same handle
  between the check and the insert?
- **Verdict**: theoretically yes, practically impossible. Two concurrent
  signups with different uuids producing the same md5 8-char prefix
  AND racing in the millisecond window between SELECT and INSERT — the
  joint probability is so small it's not worth defending against. If
  it ever happened, the INSERT would raise `unique_violation 23505`,
  the auth.users INSERT rolls back, the user retries signup, the second
  pass uses different `v_attempt` and produces a different handle. So
  it self-heals on retry with a single observable signup failure.
- **Severity**: LOW (could harden with `EXCEPTION WHEN unique_violation
  THEN GOTO retry` but the cost > value at this fleet size).

### F5 — JSON path NULL safety

- **Surface**: `COALESCE(NEW.raw_user_meta_data->>'locale', 'ko')`.
- **Question**: any path that produces a non-text non-NULL surprise?
- **Verdict**: `->>` always returns text or NULL. COALESCE handles NULL.
  The follow-on `IF v_locale NOT IN ('ko', 'en')` coerces any other
  string (including empty string from `{"locale":""}`) to 'ko'. The
  CHECK constraint on `profiles.locale` only allows 'ko'|'en'; this
  matches.
- **Severity**: none.

### F6 — Trigger atomicity / failure rollback

- **Surface**: `AFTER INSERT ... FOR EACH ROW EXECUTE FUNCTION ...`.
- **Question**: if `handle_new_user` raises, does `auth.users INSERT`
  roll back?
- **Verdict**: YES. AFTER INSERT triggers fire inside the same
  transaction as the triggering statement. A RAISE EXCEPTION causes
  the entire transaction (including the auth.users row) to roll back.
  Net: no orphan auth.users rows, no signup-without-profile state.
  The cost: a profile-creation failure surfaces as a signup failure
  to the user. That's the right tradeoff — the original bug was
  exactly the orphan state.
- **Severity**: none.

### F7 — REVOKE EXECUTE vs trigger firing

- **Surface**: `REVOKE EXECUTE ON FUNCTION public.handle_new_user()
  FROM PUBLIC, authenticated, anon`.
- **Question**: does REVOKE block the trigger from firing?
- **Verdict**: NO. PostgreSQL trigger invocation does NOT route through
  the function-EXECUTE privilege check; the trigger system invokes the
  function via internal trigger fire mechanics. `REVOKE EXECUTE` only
  blocks direct calls (`SELECT public.handle_new_user(forged_row)` from
  a malicious authenticated user trying to insert a profile under an
  arbitrary uuid). Defense in depth — keeps the surface tight without
  affecting the happy path.
- **Severity**: none. Confirmed correct.

### F8 — 'client' default role consistency

- **Surface**: `INSERT ... role='client'`.
- **Question**: does this match persona A?
- **Verdict**: YES. DECISIONS_CACHE Q-094 lists `client` as the active
  Brand persona for Phase 4–9. The trigger creates every new user as
  a Brand client by default. The artist bootstrap path (sub_13 script
  via service-role admin) inserts/upserts with `role='artist'`
  explicitly and bypasses the trigger default — except the trigger
  ALSO fires on the `auth.admin.createUser` call. So the order is:
  1. `supabase.auth.admin.createUser({email, password, ...})` → auth.users INSERT
  2. Trigger fires → profile row inserted with role='client' (default)
  3. Script's `supabase.from('profiles').upsert({id, role: 'artist', ...})`
     UPDATEs the just-created row, role flips to 'artist'.
  This works because `upsert` on (id) PK conflict performs UPDATE.
- **Severity**: none. Important to note for amend_02.

### F9 — Function ownership

- **Surface**: implicit ownership via `CREATE OR REPLACE FUNCTION` run
  by the migration applier (typically the `postgres` role).
- **Question**: is the function owned by a privileged enough role to
  bypass profile RLS via SECURITY DEFINER?
- **Verdict**: YES. Migrations on Supabase run as `postgres` (the
  superuser), so the function inherits postgres ownership and SECURITY
  DEFINER lets it bypass RLS unconditionally. This is the standard
  Supabase pattern for `handle_new_user`-style triggers (it's exactly
  what Supabase's own auth-hook docs recommend).
- **Severity**: none.

### F10 — Empty display_name fallback

- **Surface**: `v_display_name := NULLIF(split_part(COALESCE(NEW.email,
  ''), '@', 1), '');` plus `IF NULL THEN 'user';`.
- **Question**: profiles.display_name is NOT NULL. Any path that lands
  on NULL or empty?
- **Verdict**: NO. The COALESCE/NULLIF/IF chain guarantees a non-empty
  string. Worst case: 'user'. Tested mentally:
  - `email = NULL` → `''` → split_part('', '@', 1) = `''` → NULLIF('', '') = NULL → 'user'.
  - `email = '@example.com'` → split_part = '' → NULLIF = NULL → 'user'.
  - `email = 'foo@bar.com'` → split_part = 'foo' → NULLIF = 'foo' (kept).
- **Severity**: none. Hardening over the spec's `COALESCE(split_part,
  'user')` (which would have left empty string through).

### F11 — Concurrent signups creating identical-handle race redux

Already covered in F4. Adding here as cross-reference: per F8, the
artist bootstrap path's `upsert` runs AFTER the trigger has produced
a 'client'-role profile. If we ever support concurrent admin creates
of N artist accounts, each goes through this trigger first then
upsert. The trigger's handle generation is per-user-uuid so no
collision between admin-creates either. Fine.

## Verdict — 0 HIGH-A, 0 HIGH-B, 0 MED-A residual

- **HIGH-A** (security-critical): none.
- **HIGH-B** (high-impact bug): none.
- **MED-A** (defense-in-depth, auto-fixable): F4 race window — declined
  with rationale. F3 attempt-count comment drift — fixed in this file
  by removing the explicit count from the comment.
- **LOW**: none requiring action.

Layer 1 verdict: PASS. Recommend Layer 2 (yagi + this-chat) review
focusing on:
- Phase 5 Artist intake design alignment (does the trigger break that?
  Likely no, since the artist bootstrap can override role via upsert
  per F8).
- Test 1 / Test 3 (post-apply functional test design adequacy).
