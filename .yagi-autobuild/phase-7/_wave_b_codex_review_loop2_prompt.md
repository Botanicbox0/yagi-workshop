Phase 7 Wave B — K-05 LOOP-2 (cascade verification of LOOP-1 inline fix).

LOOP-1 returned 1 MED-B finding: TOCTOU race in admin status transitions.
LOOP-1 inline fix applied as a cascade-not-cycle change:
- Added `.in("status", requireFromStatus)` and `.select("id")` to the UPDATE
  in `transitionRequestStatus` so the UPDATE itself is a CAS (atomic row
  filter), not a separate select-then-update.
- Added rowCount=0 → "stale_status" return path so the caller surfaces a
  friendly toast and refreshes when the CAS lost the race.
- Notification fires only AFTER the CAS UPDATE succeeded.
- The remaining `decision_metadata.history` concurrent-append edge (where
  two admins on different transitions both see `in_review` and the second
  loser's history append is lost) is registered as
  FU-Phase7-B-K05-F1-rpc-jsonb-history-append (Phase 8 RPC fix).

Per L-052 cascade-vs-cycle distinction: this is a CASCADE fix (inline change
to address the LOOP-1 finding), not a re-test of the same LOOP-1 surface.
Confirm:

1. The CAS UPDATE pattern in `transitionRequestStatus` correctly forecloses
   the LOOP-1 finding's exploit scenario (concurrent admins racing the same
   source state both passing the source-state check then last-write-wins).
2. The new "stale_status" error path is consistent with the rest of the
   action's error contract.
3. No NEW security/correctness regression introduced by the cascade fix.
4. K-06 inline fixes (Findings 1-3 + F8 trivial wording) did not introduce
   any new code-correctness issue:
   - request-form.tsx asset row: `flex flex-col sm:flex-row` + `min-w-0`
     on URL input (responsive layout fix only, no security surface).
   - review-actions.tsx: removed per-button helper text + ActionButton
     simplified to a single Button (no logic change, only render).
   - review/page.tsx back link: dynamic `?status=${campaign.status}` (uses
     server-fetched value; no user input injection).
   - en.json sponsorship_co_sponsor renamed `Partner / shared funding` →
     `Shared funding` for consistency with admin review surface.

## Files changed since LOOP-1

- `src/app/[locale]/app/admin/campaigns/_actions/campaign-actions.ts` —
  CAS pattern in transitionRequestStatus (lines ~530-560).
- `src/app/[locale]/app/admin/campaigns/[id]/review/review-actions.tsx` —
  toast for stale_status path + helper text removal + ActionButton simpler.
- `src/app/[locale]/app/admin/campaigns/[id]/review/page.tsx` —
  back link uses dynamic campaign.status.
- `src/app/[locale]/app/campaigns/request/request-form.tsx` —
  reference asset row mobile responsive layout.
- `messages/{ko,en}.json` — toast_stale_status key added; per-button
  helpers removed; actions_summary single-line guidance added;
  sponsorship_co_sponsor en value normalized.

## Already-deferred (do NOT flag)

- LOOP-1 verdict (MED-B FINDING 1) — LOOP-2 cascade fix here.
- LOW K-06 findings 4/5/6/7/9 — all FU-registered.
- All Wave A K-05 + K-06 surfaces.
- HF4 carried-over `project_detail.timeline.routing` wording finding (Phase 8).
- All Wave C/D scope.

## Output format

## VERDICT: <CLEAN | NEEDS-ATTENTION>

For each NEW finding (HIGH or MED only):
[FINDING N] CLASS: <HIGH-A|HIGH-B|HIGH-C|MED-A|MED-B|MED-C>: file:line — short description — recommended fix

If 0 NEW HIGH/MED findings: "VERDICT: CLEAN — Wave B LOOP-2 cascade fix resolves LOOP-1 finding without regression. Ready for ff-merge gate."

End with one-line summary.
