# AGENTS.md — supabase/ (migrations, RLS, DB)

> Scoped rules for the database layer. Inherits top-level `AGENTS.md`.
> Full DB write protocol lives in `CLAUDE.md` ("Database write protocol").

## Migration naming & lifecycle
- File name: `timestamp_action_description.sql` (e.g. `20260528120000_add_brand_billing.sql`).
- Migration chain stays **linear**. Compose main + hardening into one push when main is local-only (G2 pattern), not a 3-stage chain.
- Canonical fresh-clone reproducer = `supabase/migrations/20260422120000_phase_2_0_baseline.sql`. The 23 "missing locally" historical entries are inert forensic records — do NOT truncate remote `schema_migrations`.

## RLS policy pattern
- Write every policy assuming a **malicious user**. Default-deny; grant narrowly.
- Use `user_roles` + helpers `is_yagi_admin` / `is_ws_member` / `is_ws_admin`.
- Test each policy with an **anon query** and a wrong-workspace query before trusting it.
- Minimize SECURITY DEFINER + service-role; if used, justify and review under K-05.

## MCP: execute_sql vs apply_migration (분리)
- **`execute_sql`** = read-only inspection only (schema/RLS/select). NEVER mutate prod with it.
- **`apply_migration`** = the only sanctioned write path; it records the migration. HIGH/DANGER → confirm gate.
- Default posture = **read-only**. Production write is NEVER silent — requires explicit confirm.

## Verify query is mandatory (lesson)
- After any apply: verify schema / RPC / policy with a **direct live query** — never trust the commit message or migration text alone.
- `get_advisors(security)` + `get_advisors(performance)` → no new warnings/regressions.
- Smoke-test new RPCs: auth-NULL path + happy path + primary error path.

## Codex K-05 before prod write
- Every new migration/RPC/policy → `/codex:adversarial-review` before first `apply_migration` / `supabase db push --linked`. No exceptions.
- CLEAN → apply → verify → commit migration file(s) → push → notify (deferred findings → `FOLLOWUPS.md`).

## Risk level
- Production DB write = **HIGH/DANGER** → Claude review + 야기 confirm + dry-run preferred. Local draft = MED.
