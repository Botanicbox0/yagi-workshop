Phase 5 Wave B task_05 v3 sub_5 patch — K-05 LOOP 2 (Tier 3 low). Narrow verify of the LOOP 1 finding closures only.

LOOP 1 was NEEDS-ATTENTION with 5 findings:
- F1 (HIGH): /api/oembed DNS rebinding window between assertSafeUrl resolve and fetch
- F2 (HIGH): addBriefingDocumentAction status='draft' TOCTOU between SELECT and INSERT (RLS INSERT did not enforce parent status)
- F3 (HIGH): updateBriefingDocumentNoteAction had no parent project status check (RLS UPDATE did not enforce parent status)
- F4 (MED): claimed projects_update RLS denied creator+draft branch — Builder verified false positive (current RLS includes that branch). NO ACTION.
- F5 (MED): sidebar autosave AbortController cancels client UI handling but not the dispatched server action; older slow save can commit after newer one.

Files in scope (3 total — verify only):
- src/app/api/oembed/route.ts (rewritten — generic OG scrape REMOVED; allowlist-only YouTube/Vimeo via lib/oembed + Instagram bare provider tag; non-allowlisted hosts return generic with null thumbnail)
- supabase/migrations/20260504180000_phase_5_briefing_documents_status_lockdown.sql (NEW — DROPs and re-CREATEs briefing_documents_insert WITH CHECK + briefing_documents_update USING/WITH CHECK with `p.status = 'draft'` predicate added to the workspace_members JOIN; yagi_admin bypass branch preserved status-agnostic; DO block asserts ins_check / upd_using / upd_check / del_using all reference p.status, table-level UPDATE still revoked, column-level UPDATE on (note, category) still granted)
- src/app/[locale]/app/projects/new/briefing-canvas-step-2-sidebar.tsx (autosave rewritten — single-flight queue: inFlightRef + pendingRef; 5s debounce calls runSave(snapshot) which queues if in-flight or runs and on completion drains pending; no AbortController; lastCommittedRef pattern preserved)

Out of scope (do NOT review): briefing-step2-actions.ts, briefing-canvas-step-2.tsx, briefing-canvas-step-2-brief.tsx, briefing-canvas-step-2-reference.tsx, all i18n keys, Wave A migrations.

LOOP 2 verify only:

1. F1 closure — confirm: no remaining DNS resolution path; no remaining generic-host fetch; only YouTube/Vimeo paths execute fetchVideoMetadata (which talks to provider-trusted oembed endpoints); Instagram path returns synthetic JSON with no fetch; non-allowlisted hosts return synthetic JSON with no fetch. Verify validateUrlShape blocks .local/.internal/localhost prefixes (no DNS — pure shape check). Confirm no new SSRF vector introduced by the lazy import of @/lib/oembed.

2. F2+F3 closure — confirm: briefing_documents_insert WITH CHECK references p.status='draft'; briefing_documents_update USING references p.status='draft'; briefing_documents_update WITH CHECK references p.status='draft'; yagi_admin bypass branch is status-agnostic on all three (admin support path preserved). Verify the DO-block grep predicate (`pg_get_expr(...) NOT LIKE '%p.status%'`) actually matches these expressions when stored. Verify the migration is idempotent under DROP IF EXISTS / CREATE; verify nothing else got modified.

3. F5 closure — confirm: at most one save in flight at any moment (inFlightRef gate); pendingRef stores latest snapshot if save is in-flight; finally block drains pendingRef and recursively triggers runSave; lastCommittedRef updates only on res.ok and uses the snapshot's serialized form (not the live form state). Verify no path causes interleaved completions to flip lastCommittedRef back to a stale value. Verify cleanup function still clears the debounce timer on unmount/dep-change.

Already-deferred (do NOT flag again — registered as FUs by yagi):
- FU-Phase5-3 (defer): generic OG scrape with undici dispatcher + IP-pinning custom lookup (current allowlist is the safe interim)
- FU-Phase5-4 (defer): projects table column-grant lockdown for the 13 sidebar metadata columns (Phase 5 ff-merge batch sweep)
- F4 LOOP 1 (false positive): projects_update RLS already permits creator+draft+member branch, verified via SQL by Builder

Scale-aware rule context: < 100 internal users, all-trusted Phase 5 onboarding pool. MED-B/C with no direct user-supplied input + no external < 30d delivery + not 3rd-repeat → defer to FU. MED-B/C otherwise → inline fix.

Output format:

## VERDICT: <CLEAN | NEEDS-ATTENTION | PARTIAL>

CLEAN = all 4 LOOP 1 findings (F1 / F2 / F3 / F5) are closed by the patch; no NEW HIGH/MED findings introduced.

NEEDS-ATTENTION = at least one of F1/F2/F3/F5 not closed OR a new HIGH/MED introduced. Per LOOP policy: LOOP 2 PARTIAL → single-line miss rule applies (Builder closes inline + commits without LOOP 3); LOOP 2 NEEDS-ATTENTION on a structural finding → STOP + escalate.

For each NEW finding:
[FINDING N] CLASS: file:line — short description — recommended fix

End with one-line summary suitable for the run log.
