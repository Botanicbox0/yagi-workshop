# Subtask 14 result

**status:** complete

**files_created:**
- `.yagi-autobuild/phase-1-2-e2e.md`

**length_lines:** 375

**sections_present:**
- Header (title, date, prerequisites)
- Test 1 — Create project
- Test 2 — Reference collector
- Test 3 — Thread conversation
- Test 4 — Status transitions
- Test 5 — Settings
- Test 6 — RLS sanity
- Appendix — Routes reference
- Appendix — Known gaps

## Notes

All content follows the per-test format specified in the subtask spec:
- **Goal:** one-sentence objective
- **Steps:** numbered action list
- **Expected:** observable results
- **RLS / data check:** SQL or curl examples
- **If it fails, look here:** source file pointers

The runbook:
- References no hardcoded UI strings from the codebase; uses role/status/field descriptors instead
- Includes exact curl commands for RLS sanity checks
- Carries over all known gaps from checkpoint.md (caption editing, coming soon placeholders, tone ghost field, workspace logo, invitation send, email queue)
- Lists all 7 new routes from Phase 1.2 in the Routes reference appendix
- Provides actionable debugging guidance for each test
- Is concise and manual-testable without automation tooling

No deviations from spec. File ready for user manual testing.
