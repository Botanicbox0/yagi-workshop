Phase 7 Wave A.1 — K-05 LOOP-2 (Tier 1 HIGH, narrow re-review).

LOOP-1 verdict (NEEDS-ATTENTION) — 1 HIGH-B + 2 MED-A:
- F1 HIGH-B: sponsor INSERT row-gated but not column-gated. Could seed admin/audit fields.
- F2 MED-A: applicant campaign_distributions INSERT same problem (forge added_by, audit fields).
- F3 MED-A: DO-block missing INSERT column matrix asserts.

## LOOP-2 fixes (verbatim from LOOP-1 recommendations)

### F1 HIGH-B fix

`supabase/migrations/20260506000000_phase_7_campaigns.sql` — sponsor INSERT path:

1. **Column-level INSERT lockdown**:
```sql
REVOKE INSERT ON campaigns FROM authenticated;
GRANT INSERT (
  slug, title, description, brief, reference_assets,
  sponsor_workspace_id, status, request_metadata, created_by, updated_at
) ON campaigns TO authenticated;
```

2. **Updated `campaigns_insert_sponsor` WITH CHECK**:
```sql
WITH CHECK (
  status = 'requested'
  AND created_by = auth.uid()                          -- NEW: forge prevention
  AND sponsor_workspace_id IS NOT NULL
  AND has_external_sponsor IS NOT DISTINCT FROM false  -- NEW: defense-in-depth
  AND external_sponsor_name IS NULL                    -- NEW
  AND decision_metadata IS NULL                        -- NEW: admin audit
  AND submission_open_at IS NULL                       -- NEW
  AND submission_close_at IS NULL                      -- NEW
  AND distribution_starts_at IS NULL                   -- NEW
  AND EXISTS (...workspace_members JOIN workspaces with kind IN ('brand','artist'))
)
```

Rationale: column GRANT prevents most seedable columns; the WITH CHECK belt-and-braces ensures even if the GRANT matrix drifts, the policy denies forged-audit-field inserts. compensation_model / compensation_metadata / allow_* are NOT in the GRANT (they take DEFAULTS) so admin can rewrite later.

### F2 MED-A fix

`campaign_distributions` applicant INSERT path:

1. **Column-level INSERT lockdown**:
```sql
REVOKE INSERT ON campaign_distributions FROM authenticated;
GRANT INSERT (
  submission_id, channel, url, posted_at, added_by, notes
) ON campaign_distributions TO authenticated;
```

2. **Updated `campaign_distributions_insert_applicant` WITH CHECK**:
```sql
WITH CHECK (
  added_by = auth.uid()                                -- NEW: forge prevention
  AND EXISTS (...workspace_members JOIN parent submission status='approved_for_distribution')
)
```

Metric fields (view_count/like_count/comment_count/metric_logged_at/metric_log_notes) NOT in INSERT GRANT — they'll get NULL/0 defaults; applicant adds them later via UPDATE (column-grant permitted for those fields).

### F3 MED-A fix

DO-block expanded with full INSERT column matrix asserts (sections j, k, l):
- (j) campaigns INSERT: 9 granted-TRUE asserts + 9 admin-only-FALSE asserts + table-level INSERT FALSE
- (k) campaign_distributions INSERT: 6 granted-TRUE + 5 admin-only-FALSE + table-level INSERT FALSE
- (l) campaign_categories / campaign_submissions / campaign_review_decisions: table-level INSERT FALSE (server-action only)

Total asserts in the DO-block now: 56 invariants (was 33). All sub_5/Phase-6 hardening patterns mirrored.

## Adversarial focus areas (LOOP-2, narrow)

1. **Column GRANT INSERT correctness**:
   (a) campaigns INSERT GRANT — does the granted column set still allow a sponsor to author a request? `slug, title, description, brief, reference_assets, sponsor_workspace_id, status, request_metadata, created_by, updated_at` — sponsor needs to write all of these (slug auto-generated server-side, status='requested' forced, created_by=auth.uid() forced, sponsor_workspace_id their own). Missing anything?
   (b) campaign_distributions INSERT GRANT — `submission_id, channel, url, posted_at, added_by, notes` — applicant needs all of these. Missing anything?
   (c) Are there NOT NULL columns without DEFAULTs that we accidentally locked out? campaigns.created_by is NOT NULL FK — granted ✓. campaigns.slug is NOT NULL UNIQUE — granted ✓. campaigns.status defaults 'draft' — but for sponsor INSERT we force 'requested' (need to GRANT status — granted ✓). campaign_distributions.added_by is FK profiles, not NOT NULL but per WITH CHECK = auth.uid() so always set. campaign_distributions.url NOT NULL — granted ✓. channel NOT NULL — granted ✓.

2. **WITH CHECK soundness**:
   (a) `created_by = auth.uid()` and `added_by = auth.uid()` — both are FK to profiles(id); auth.uid() is the auth user uuid. Confirm profiles.id = auth.users.id (it does in this codebase per Phase 1 bootstrap_workspace pattern).
   (b) `has_external_sponsor IS NOT DISTINCT FROM false` semantically same as `(has_external_sponsor IS FALSE OR has_external_sponsor IS NULL)`. Since the column is NOT NULL DEFAULT false, the IS NULL branch is unreachable. The check is intentional defense-in-depth — flag if you think the redundancy is bad.
   (c) Are there other admin-audit columns I missed in the WITH CHECK belt-and-braces? Walk the full campaigns column list and confirm each non-granted column either takes DEFAULT or is explicitly NULL-asserted in the WITH CHECK.

3. **DO-block self-assert correctness**:
   (a) Walk through each new assert (sections j, k, l). Any duplicates with existing UPDATE asserts? (sections b, c, e, f, h, i are UPDATE; j, k are INSERT — different verbs, no dup.)
   (b) Any column the assert misses? Check `\d+ campaigns` style enumeration vs the asserts. Same for campaign_distributions.

4. **Public showcase scope (already CONFIRMED in LOOP-1, re-verify)**:
   campaigns SELECT public: status IN ('published','submission_closed','distributing','archived'). campaign_submissions SELECT public: status='distributed'. campaign_distributions SELECT public: parent submission.status='distributed'.

## Already-deferred (do NOT flag again)

- Compensation 정산 logic (Phase 11)
- Roster funnel UI (Phase 8)
- Challenge MVP (Phase 9 optional)
- Distribution metric API auto-fetch (Phase 8)
- (LOOP-1 confirmed-passes from `_wave_a1_codex_review.md` — sponsor workspace kind gate / applicant transition gates / public showcase scope / workspace_members index / category_id index — re-verify only if you see a new gap)

## Output format

## VERDICT: <CLEAN | NEEDS-ATTENTION>

For each NEW finding (NOT in LOOP-1 deferred):
[FINDING N] CLASS: file:line — short description — recommended fix

If 0 NEW HIGH/MED findings: "VERDICT: CLEAN — Wave A.1 ready for mcp.apply_migration."

End with one-line summary.
