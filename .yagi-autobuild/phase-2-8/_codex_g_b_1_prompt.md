<task>
You are reviewing a single Postgres migration file before it is applied to a
production Supabase project (no preview branch). The migration introduces
four new tables (project_briefs, project_brief_versions, project_brief_assets,
embed_cache) plus RLS policies and triggers for Phase 2.8 G_B-1 of the YAGI
Workshop platform.

File under review:
  supabase/migrations/20260426000000_phase_2_8_brief_board.sql

Source-of-truth for intent:
  .yagi-autobuild/phase-2-8/SPEC.md §3 (schema), §3.6 (RLS), §5.4 (lock semantics)

Pattern provenance to compare against:
  supabase/migrations/20260425000000_phase_2_7_commission_soft_launch.sql
  (commission_intakes RLS + state-transition trigger; same conventions apply)

Membership helpers in baseline:
  public.is_ws_member(uid uuid, wsid uuid)  — any workspace_members row
  public.is_ws_admin(uid uuid, wsid uuid)   — workspace_members.role='admin'
  public.is_yagi_admin(uid uuid)            — user_roles.role='yagi_admin'

Existing tables touched by predicates: public.projects (workspace_id FK).
This migration adds NO modifications to Phase 1.x tables.

Decision context:
  - SPEC §3.5 prescribed extending a `threads.kind` enum, but no such table
    exists; the project uses `project_threads` + `thread_messages`. v1 reuses
    that infrastructure unchanged. Block-level inline comments are Phase 2.9.
    This is intentional and not a regression — do not flag it as missing
    schema work.
  - embed_cache RLS is read-open / write-deny for authenticated; writes go
    through service-role from server actions. This is also intentional.
  - project_brief_versions is append-only (no UPDATE/DELETE policies + a
    BEFORE UPDATE trigger that always raises). Cascade-DELETE via projects
    is the only allowed removal path.
  - The `(select auth.uid())` subquery wrapping is Phase 2.7 convention for
    the RLS optimizer cache pattern; do not request changes to it.
</task>

<focus_areas>
Rank findings by exploitability against THIS schema with THIS RLS as
deployed. Concentrate on:

1. Cross-tenant data leak via the EXISTS-projects join: can a member of
   workspace A read/write project_briefs rows whose project belongs to
   workspace B? Verify the join key and the auth.uid() context.

2. Privilege escalation on status flip:
   - Can a non-yagi_admin authenticated user successfully UPDATE
     project_briefs.status from 'editing' to 'locked' or vice versa?
     Two policies exist (update_member, update_yagi). The trigger
     (validate_project_brief_update) is the column guard.
   - Edge case: USING-clause matches `status='editing'` for the member
     policy. If an attacker WITH CHECK passes a row with NEW.status='locked'
     while OLD.status='editing', does the trigger always raise?

3. Append-only soundness for project_brief_versions:
   - The reject_project_brief_version_update trigger — is there any path
     (TRIGGER bypass, replication, partition swap) where an UPDATE could
     mutate a row?
   - The validate_project_brief_version_insert trigger checks
     project_briefs.status = 'editing' and version_n = current+1. Is the
     SELECT inside the trigger subject to RLS? It runs as SECURITY DEFINER
     with search_path public,pg_temp — verify it cannot be tricked by a
     concurrent project_briefs UPDATE.

4. Lock bypass via auth.uid() coercion: every trigger has the early-return
   `IF v_caller IS NULL THEN RETURN NEW; END IF;` for service-role/direct
   DB. Is there any client-driven path that can null-out auth.uid()
   while still passing RLS as authenticated? (e.g., RPCs, materialized
   view refresh callbacks, set_config tampering via parallel session)

5. embed_cache write surface: with no INSERT/UPDATE/DELETE policy and
   FORCE ROW LEVEL SECURITY enabled, is there any authenticated-side
   write path? Specifically check whether SELECT-with-FOR-UPDATE,
   INSERT ... SELECT, or pg_locks-based contention could cause
   side effects.

6. Constraint correctness:
   - byte_size BETWEEN > 0 AND ≤ 209715200 (200 MiB exact)
   - tiptap_schema_version monotonic; non-yagi can change it via UPSERT?
   - status CHECK 'editing'|'locked' — any transition state required?
   - content_json JSONB validation — note the SPEC says we trust TipTap
     emit; the server action enforces a 2 MiB byte cap. SQL has no
     size constraint. Is that fine, or should there be a CHECK
     `octet_length(content_json::text) <= 2*1024*1024`?

7. ON DELETE behavior for FK chains:
   - project_brief_assets.project_id → projects.id ON DELETE CASCADE.
     R2 storage objects are not deleted by the cascade (orphan; SPEC
     accepts this). Confirm there is no dangling FK.
   - uploaded_by/created_by/updated_by → auth.users(id) ON DELETE SET NULL.
     Is auth.users guaranteed to permit FK references in this Supabase
     deployment? (Some projects use a public.profiles 1:1 mirror instead.)

8. Realtime publication: only project_brief_versions is added. Is any
   sensitive column unintentionally exposed?

For each finding, use the severity taxonomy from
.yagi-autobuild/CODEX_TRIAGE.md:
  HIGH-A: cross-tenant data leak | privilege escalation | auth bypass
          (exploitable today against this RLS as written)
  HIGH-B: auth ok but logic flaw with significant impact
  HIGH-C: input validation gap with app-layer guard
  MED-A : auto-fixable medium (e.g., missing CHECK, ERRCODE choice)
  MED-B : defensible default that could be tightened later
  LOW-A : style / convention drift from prior migrations
  LOW-C : theoretical defense-in-depth
</focus_areas>

<grounding_rules>
- Cite file + line for every finding. No hand-waving.
- Quote the offending statement (SQL fragment, function body line) inline.
- For RLS findings, walk the predicate from SELECT auth.uid() → JOIN →
  return rows. Show the predicate evaluation that lets a malicious user
  succeed.
- Distinguish between "this triggers an EXCEPTION" and "this returns 0
  rows silently" — the difference matters for trigger-vs-RLS layering.
- Treat the SPEC drift on `threads.kind` as already adjudicated. Do not
  flag the absence of an enum extension.
</grounding_rules>

<structured_output_contract>
Output exactly this shape, no preamble, no closing prose:

VERDICT: <CLEAN | MEDIUM_ONLY | NEEDS_FIX>

If NEEDS_FIX or MEDIUM_ONLY, list each finding as:

----
ID: <K05-G_B_1-NN>
SEVERITY: <HIGH-A|HIGH-B|HIGH-C|MED-A|MED-B|LOW-A|LOW-C>
LOCATION: <file>:<line range>
QUOTE:
  <2–6 lines of the offending SQL>
EXPLOIT:
  <1–3 sentences. Concrete attack path. If theoretical, state "theoretical".>
FIX:
  <1–3 sentences. Concrete patch sketch. Reference the line to change.>
----

After all findings, end with:

SUMMARY: <one sentence>
</structured_output_contract>

<dig_deeper_nudge>
If your first pass finds nothing, do a second pass concentrated on
trigger ordering, search_path edge cases (pg_temp shadowing), and
RLS recursion through the helper functions (is_ws_member /
is_yagi_admin) themselves. Those are the categories that recur
across YAGI's prior K-05 reviews.
</dig_deeper_nudge>
