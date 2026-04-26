You are reviewing Phase 2.8.1 hardening branch `g-b-1-hardening`,
LOOP 2 (verification pass after loop 1 auto-fixes). Adopt the same
adversarial-reviewer posture from
`.yagi-autobuild/codex-review-protocol.md`.

## Loop 1 result (already triaged)

Loop 1 surfaced 3 findings:
  1. HIGH-B (G_B1-H): convert_commission_to_project left
     `project_briefs.content_json` at the empty default; Brief Board
     tab rendered empty after a converted commission notification.
     **FIX APPLIED**: RPC now seeds content_json from v_intake.brief_md,
     expanding each newline into a TipTap paragraph node (empty lines
     → empty paragraphs).
  2. HIGH-B (G_B1-B): submitDraftProject permitted demoting any
     caller-owned project from any status back to 'draft' /
     'submitted'. **FIX APPLIED**: explicit
     `if (target.status !== "draft") return forbidden` short-circuit
     AND `.eq("status", "draft")` filter on the UPDATE.
  3. MED (G_B1-B): ensureDraftProject 23505 race re-SELECT can run
     before the winner inserts the project_briefs sibling, surfacing
     a generic db error to the loser. **DEFERRED** as
     FU-2.8.1-ensuredraft-race-brief-poll (transient error toast
     only, no data loss).

## Your task in loop 2

1. **Verify fix #1 (commission convert content_json seed)**:
   - Read `supabase/migrations/20260427020000_phase_2_8_1_commission_convert.sql`
     around the project_briefs INSERT.
   - Confirm the new INSERT generates a valid TipTap doc shape:
     `{type:"doc", content:[paragraph nodes...]}`.
   - Confirm empty `brief_md` (NULL or "") still produces a valid
     empty doc (not a NULL or invalid jsonb).
   - Confirm the JSON-shape passes the existing `octet_length <=
     2 MiB` CHECK constraint on `project_briefs.content_json`.
   - Confirm the trigger `validate_project_brief_change` still allows
     the INSERT (yagi_admin bypass branch is unchanged).

2. **Verify fix #2 (submitDraftProject status guard)**:
   - Read `src/app/[locale]/app/projects/new/actions.ts`
     `submitDraftProject` body.
   - Confirm both the early-return guard
     `if (target.status !== "draft") return { error: "forbidden" }`
     AND the SQL filter `.eq("status", "draft")` are in place.
   - Confirm no regression for the legitimate wizard path
     (target.status='draft' → success).

3. **Re-scan the same diff for any HIGH-A or HIGH-B that loop 1
   missed**. Especially:
   - The new content_json seeder uses `regexp_split_to_table` and
     `jsonb_agg` — any injection vector via a malicious brief_md
     payload? (Note: brief_md is a CHECK-bound text column with
     length 50–10,000, no jsonb interpolation issues from string
     content because we use jsonb_build_object/jsonb_build_array
     parameterization.)
   - Any privilege-escalation now that submitDraftProject is
     status-guarded?

## Output format

If both fixes verify cleanly and no new HIGH-A / HIGH-B findings:
  Return a one-liner verdict: `LOOP_2_PASS — fixes verified, no new findings`
  Optionally list MED / LOW findings (which we'll log to FOLLOWUPS).

If loop 1 fix is incorrect or new HIGH-A / HIGH-B findings exist:
  Return numbered findings in the loop-1 format
  (Severity / Location / Observation / Exploit / Fix).
  End with verdict `LOOP_2_REGRESS=N` or `LOOP_2_NEW=N`.

Be terse. Spot-check rather than re-scanning everything from scratch
— the rest of the diff was reviewed in loop 1.
