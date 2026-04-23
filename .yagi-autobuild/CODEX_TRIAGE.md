# Codex Finding Triage Framework

Canonical taxonomy for Codex adversarial-review findings on migrations and
security-critical code paths. Eliminates the web Claude round-trip for
mechanical triage decisions.

**Invocation:** Builder runs Codex K-05 pre-apply on every security-critical
migration. Builder classifies each finding by the taxonomy below, then
executes the mapped action **without** escalating to yagi or web Claude
unless the taxonomy is truly ambiguous.

**Escalation rule:** If a finding does not cleanly fit any bucket below,
OR if two buckets conflict, OR if the recommended fix creates a larger
blast radius than the finding, STOP and escalate (yagi + web Claude).

---

## Severity axis (unchanged from K-05 framework)

| Severity | Meaning | Default action |
|---|---|---|
| **HIGH** | Exploitable, data loss, auth/RLS bypass | Blocks apply. Must fix before apply. |
| **MEDIUM** | Race, edge case, missing defense-in-depth | Fix inline or defer per category below. |
| **LOW** | Cosmetic, portability, style, SQLSTATE class polish | Batch fix inline; no deferral. |

## Category axis (introduced by this framework)

Each severity has one or more **category suffixes** that dictate the
action. `HIGH-A`, `MED-A`, `MED-B`, etc.

---

## HIGH categories

### HIGH-A — RPC / grant exposure

**Pattern:** `GRANT EXECUTE ... TO anon` (or any over-permissive role) on
a function that reads admin-only or audit-only data.

**Canonical example:** G2 hardening v1 H1 — `is_handle_available` granted
to `anon`, exposing `handle_history.old_handle` enumeration past
owner/admin-only RLS on the table itself.

**Fix action (Builder, no escalation):**
- `REVOKE EXECUTE ON FUNCTION ... FROM <role>`
- Tighten grant to the minimum role that actually calls the function.
- Verify all callers are covered by the tightened grant.

**Escalation trigger:** If removing the grant breaks a legitimate public
surface (e.g., signup form availability-check BEFORE auth), escalate.
In that case the fix is a different design (proxy via authenticated
server action, or a deliberately-public reserved-handles view), not a
grant change.

### HIGH-B — RLS bypass via SECURITY DEFINER

**Pattern:** `SECURITY DEFINER` function without `SET search_path = public, pg_temp`
OR with a query that reads privileged tables and returns data to callers
who should not see it.

**Fix action (Builder):** Add `SET search_path = public, pg_temp`. Audit
the function body for data-leak paths. If the function returns data the
caller role should not see, redesign as a scoped read with explicit
row filters.

**Escalation trigger:** Any fix that would require changing the calling
contract (breaking callers). Escalate.

### HIGH-C — Data loss / integrity

**Pattern:** DELETE / UPDATE without a WHERE constraint. DROP without
IF EXISTS in a non-idempotent context. Migration that destroys rows
without a recovery path.

**Fix action:** STOP. Always escalate. Never apply destructive DDL
without yagi confirm via kill-switch protocol.

---

## MEDIUM categories

### MED-A — Structured error contract

**Pattern:** Function documents structured error names in comments
(`handle_taken`, `handle_retired`, etc.) but code path leaks raw
`unique_violation` (SQLSTATE 23505 bare) or other generic constraint
errors.

**Canonical example:** G2 hardening v1 M1 — `change_handle` documented
structured `handle_taken` / `handle_retired` errors but the INSERT→UPDATE
path bypassed the precheck under concurrency and returned bare 23505.

**Fix action (Builder):**
- Wrap the DML in `BEGIN ... EXCEPTION WHEN unique_violation THEN ...`.
- Inside handler: `GET STACKED DIAGNOSTICS v_constraint = CONSTRAINT_NAME;`
- Remap by constraint name to the documented structured error name.
- Unknown constraint → `RAISE` (re-raise original) for bug visibility.
- Optional: add `SELECT ... FOR UPDATE` to serialize same-row contention
  where the race surface warrants it.

**Escalation trigger:** If the constraint naming is not stable across
environments (e.g., Supabase auto-names differ from local), escalate to
web Claude for a naming-standardization pass.

### MED-B — System-wide hardening defer

**Pattern:** Finding applies to one artifact but the fix would be
inconsistent unless rolled out across related artifacts system-wide.

**Canonical example:** G2 hardening v1 M2 — `handle_history` flagged for
missing `FORCE ROW LEVEL SECURITY`. Fix is correct in isolation, but
`profiles` / `creators` / `studios` / `challenges` / etc. also lack
FORCE RLS. Piecemeal FORCE on handle_history alone produces inconsistent
defense.

**Fix action (Builder):**
- DEFER via FU-* registration in `FOLLOWUPS.md`.
- Target phase: usually the next dedicated hardening sprint (historically
  Phase 2.6 security sweep).
- Log rationale in the deferring migration header §N (explain why piecemeal
  is rejected).
- Tag any adjacent findings that should roll out together (FU-8 auth.uid(),
  FU-11 UNION ALL opt, etc.).
- Do **NOT** apply the piecemeal fix.

**Escalation trigger:** If the defer would leave an exploitable path
between now and the target phase, escalate. System-wide defer is only
safe when the gap is "defense-in-depth not currently reachable."

### MED-C — Race / concurrency edge

**Pattern:** Narrow race window that is not data-destructive but can
produce UX surprises (wrong error message, stale read, duplicate work).

**Fix action (Builder):** Prefer row-level lock (`FOR UPDATE`) or
advisory lock over broader synchronization. If a row lock fully closes
the window, apply. If not, classify as MED-B (defer to coordinated
design) or escalate.

---

## LOW categories

### LOW-A — SQLSTATE / ERRCODE class polish

**Pattern:** `RAISE EXCEPTION ... USING ERRCODE = '22023'` where 22023
(invalid_parameter_value) does not match the semantic class of the
failure (e.g., applied to state-dependent failures where 55000
object_not_in_prerequisite_state is the correct SQL standard class).

**Fix action (Builder):** Map to the correct SQLSTATE class inline.
Reference table:
- `22023` invalid_parameter_value — NULL input, wrong-type input
- `55000` object_not_in_prerequisite_state — state-dependent failures
- `23505` unique_violation — uniqueness (auto by constraint)
- `23514` check_violation — check constraint (auto by constraint)
- `42501` insufficient_privilege — auth / permission
- `P0001` raise_exception — generic application error (fallback)
- `P0002` no_data_found — row expected but not found

### LOW-B — Null guard

**Pattern:** Function can receive NULL input that does not produce a
structured error; falls through to a generic constraint/downstream error.

**Fix action (Builder):** Add an explicit `IF <arg> IS NULL THEN RAISE
EXCEPTION ... USING ERRCODE = '22023'` guard early in the function.
For SELECT-style functions that should return a neutral value on NULL
input, return that value (e.g., `is_handle_available(NULL)` → false).

### LOW-C — Optimizer / performance polish

**Pattern:** UNION ALL where OR EXISTS would short-circuit. Subquery
that materializes when EXISTS is enough. Missing partial index for a
specific query.

**Fix action (Builder):** Defer via FU-* if not on hot path. Fix inline
if the query appears on any user-facing SLA path (gallery, submission
validation, etc.). Document the deferred form in the FU-* body for
future reference.

### LOW-D — Cosmetic / comment

**Pattern:** Wrong comment, outdated reference, docblock mismatch with
code.

**Fix action (Builder):** Fix inline. No deferral, no escalation.

---

## Applied example — G2 hardening v1

Codex K-05 pass 1 on `20260424000000_phase_2_5_g2_handle_history.sql`
found 6 issues. Triage:

| Finding | Classification | Action taken |
|---|---|---|
| H1 anon grant on is_handle_available | **HIGH-A** | REVOKE in hardening v1 §1 |
| M1 race leaks bare 23505 | **MED-A** | EXCEPTION block + CONSTRAINT_NAME remap in hardening v1 §4 |
| M2 missing FORCE RLS on handle_history | **MED-B** | Defer → FU-13 Phase 2.6 system-wide |
| L1 22023 on state failures | **LOW-A** | Remap to 55000 in hardening v1 §4 |
| L2 is_handle_available(NULL) returns true | **LOW-B** | NULL guard in hardening v1 §3 |
| L3 change_handle(NULL) NOT NULL error | **LOW-B** | NULL guard in hardening v1 §4 |

All 6 resolved without yagi or web Claude round-trip. Pass 2: CLEAN.

---

## Update discipline

This file is **append-only** for new categories. Existing categories
stay stable so Builder's mental map does not drift. A new pattern that
does not fit any category is a proposal for a **new** category with a
new suffix letter — never a reinterpretation of an existing one.

New category additions require:
- Canonical example from a real Codex finding
- Fix action clearly separated from escalation trigger
- Entry in the applied-example table of the session that introduced it

Last updated: 2026-04-23 (G2 hardening v1 session)
