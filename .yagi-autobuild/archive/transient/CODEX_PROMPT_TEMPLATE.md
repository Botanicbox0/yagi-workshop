# Codex Adversarial Review — Prompt Template

Canonical prompt structure for Codex K-05 passes on migrations and
security-critical code. Incorporates the TRIAGE taxonomy from
`.yagi-autobuild/CODEX_TRIAGE.md` so Codex output is classification-ready.

**When to use:** Every `/codex:adversarial-review` invocation from the
G3 first-Codex onward uses this template. Before this template, prompts
were ad-hoc and classification happened after the fact; this template
moves classification pressure into the prompt so Codex responses come
out in TRIAGE-ready form.

---

## Template skeleton

```
Codex K-05 adversarial review — <PHASE>-<GATE> migration <V>.

Target files:
<list all files composing the effective migration state. For composite
reviews (main + hardening), list BOTH with the (unchanged) / (new) tag>

Context:
<brief state summary — what was done in prior passes, if any>

Already-deferred block (Codex must NOT re-raise these):
<list FU-* entries that represent deliberate deferrals for patterns
that would otherwise match Codex heuristics. Reason + target phase
for each. Required for MED-B findings to not cycle.>

Expected verdicts (per user's protocol):
- CLEAN → apply
- MEDIUM_ONLY → yagi confirm
- HIGH → STOP

Severity framework:
- HIGH = exploitable, data loss, auth/RLS bypass — blocks apply
- MEDIUM = race, edge case, missing defense-in-depth — fix inline or defer per TRIAGE
- LOW = cosmetic, portability, style, SQLSTATE polish — batch fix

TRIAGE category hint (use suffix when applicable):
- HIGH-A grant exposure
- HIGH-B SECURITY DEFINER leak
- HIGH-C data loss
- MED-A structured error contract
- MED-B system-wide hardening defer
- MED-C race / concurrency edge
- LOW-A SQLSTATE semantics
- LOW-B NULL guard
- LOW-C optimizer polish
- LOW-D cosmetic

(See .yagi-autobuild/CODEX_TRIAGE.md for canonical definitions.)

Focus areas:
<numbered list of specific things to examine. Keep to 5-8 items.
Each should be a falsifiable question, not a generic "review X".>

Additional items on your own initiative:
<items to watch for that are adjacent to focus areas but not specifically
called out. Codex uses its judgment to check these.>

Output format:
- Verdict: CLEAN / MEDIUM_ONLY / HIGH
- Findings as numbered list
- Each finding: severity prefix + TRIAGE suffix + one-line summary +
  evidence (file + line) + recommended fix
- End with "not present" block confirming each focus area was examined

Do not modify any files. Review only.
```

---

## Already-deferred block — required entries

The Already-deferred block must enumerate every FU-* that the current
migration surface knowingly does NOT address. Codex otherwise re-raises
these on every pass.

As of 2026-04-23, the canonical deferred list for Phase 2.5 migrations is:

- **FU-8** — RLS policy `auth.uid()` → `(select auth.uid())` optimization.
  Target: Phase 2.6 security sweep. Rationale: piecemeal application
  creates inconsistent performance profile across tables; batch rollout
  captures all Phase 2.5 tables in one pass.
- **FU-9** — Covering indexes for unindexed FKs.
  Target: Phase 2.6 performance sweep. Rationale: requires live query
  analysis to identify actual hot paths; inferring from schema alone
  produces false-positive indexes.
- **FU-11** — `is_handle_available` UNION ALL → OR EXISTS rewrite for
  planner short-circuit. Target: Phase 2.6 performance sweep. Rationale:
  citext index O(log n) × 2, zero load today; not on user SLA path.
- **FU-13** — FORCE ROW LEVEL SECURITY system-wide rollout.
  Target: Phase 2.6 security sweep. Rationale: defense-in-depth against
  table-owner RLS bypass; piecemeal application produces inconsistent
  enforcement across related tables. Coordinated rollout required so
  service-role code paths can be audited in one sweep.

Each new Codex pass block appends any new deferrals from the preceding
session and removes any that have been resolved.

---

## Focus areas — canonical sections

Over time certain focus areas recur. Copy from the canonical list below
and tailor as needed for the specific migration under review.

### DDL / schema safety
- UNIQUE constraint presence + naming stability for constraint_name remap
- `IF NOT EXISTS` on CREATE TABLE / INDEX / POLICY for idempotency
- FK ON DELETE behavior (cascade vs restrict) matches intent
- Column nullability matches callsite expectations
- Default values on new columns for existing rows

### RLS policies
- ENABLE RLS present (FORCE RLS deferred per FU-13 unless scope-specific)
- SELECT / INSERT / UPDATE / DELETE policies split or unified intentionally
- `auth.uid()` vs `(select auth.uid())` (FU-8 deferred — Codex skip this)
- Owner-scoped WITH CHECK matches USING for INSERT policies
- Admin bypass path documented

### SECURITY DEFINER functions
- `SET search_path = public, pg_temp` present
- `REVOKE ALL ... FROM PUBLIC` + explicit GRANT to minimum role
- No privileged data leak to caller via return path
- NULL input guard at function entry (LOW-B)
- ERRCODE semantics match standard SQL classes (LOW-A)
- Idempotency of grant preservation across CREATE OR REPLACE

### plpgsql race / concurrency
- `FOR UPDATE` on caller row when same-user race is plausible
- `BEGIN ... EXCEPTION WHEN unique_violation THEN ...` for structured
  error contract (MED-A)
- `GET STACKED DIAGNOSTICS v_constraint = CONSTRAINT_NAME` + remap
- Exception propagation for non-unique-violation errors (re-RAISE)

### Trigger interaction
- `BEFORE INSERT` / `BEFORE UPDATE` triggers do not bypass audit-column
  enforcement
- Admin-bypass branches in triggers do not short-circuit other checks
- `updated_at` trigger fires on DML from SECURITY DEFINER functions

### Grant preservation across DDL
- `CREATE OR REPLACE FUNCTION` preserves prior grants (Postgres docs)
- Order of operations: REVOKE first, then CREATE OR REPLACE, so later
  replaces don't re-grant the revoked role
- Idempotent re-runs of the migration do not re-introduce revoked grants

### Structured error contract
- Documented error names (handle_taken, handle_retired, ...) are reachable
  from every failure path that could otherwise leak a bare constraint error
- ERRCODE values documented in COMMENT ON FUNCTION match RAISE sites

---

## Output format — worked example

For reference, the G2 hardening v1 pass 2 response conformed to this shape:

```
Verdict: CLEAN

<if findings existed, they would appear here as>
[1] <SEV>-<CAT> — <one-line summary>
Evidence: <file>:<line> + SQL snippet or identifier
Fix: <1-3 sentences, minimal + specific>

Focus area dispositions:
F1. <focus area name> — Closed / <sub-finding>
F2. <focus area name> — Closed
...
A1. <additional item name> — Closed
...

<optional closing: "Safe to apply.">
```

Verdict mapping:
- `CLEAN` — zero findings at any severity
- `MEDIUM_ONLY` — no HIGH, ≥1 MED (yagi confirms)
- `HIGH` — ≥1 HIGH (STOP, hardening migration required)

---

## Update discipline

This template is stable. Changes require:
- New `Already-deferred` entry when a FU-* is registered
- New focus area when a recurring review theme emerges (added to the
  canonical sections above)
- Removed focus area only when the underlying code pattern has been
  globally eliminated from the codebase

The template itself does not change between sessions; the Already-deferred
list and focus-area selection do.

Last updated: 2026-04-23 (G2 hardening v1 session; G3 will be first
migration to use this template from the first pass)
