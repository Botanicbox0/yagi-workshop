Phase 7 Wave A.1 — K-05 LOOP 1 (Tier 1 HIGH).

Adversarial review of Wave A.1: Distributed Campaign schema (5 NEW tables) +
RLS (4-perspective audit) + column-level GRANT lockdown.

## Files in scope

NEW (DB):
- `supabase/migrations/20260506000000_phase_7_campaigns.sql` — 5 tables
  (campaigns, campaign_categories, campaign_submissions,
  campaign_review_decisions, campaign_distributions) + indexes + updated_at
  triggers + RLS ENABLE + 14 SELECT/INSERT/UPDATE/DELETE policies +
  REVOKE/GRANT column lockdown + DO-block self-asserts.

NO app-layer changes in this wave. Server actions / pages / forms ship in
A.2 / A.3 / A.4 (parallel).

Phase 7 = PIVOT to Distributed Campaign (PRODUCT-MASTER §W v1.6 lock
2026-05-05). The existing Phase 2.5 `challenges` / `challenge_submissions` /
`challenge_judgings` / `challenge_awards` tables are UNTOUCHED — this
migration creates a parallel set. Both schemas coexist.

## L-049 Mandatory 4-perspective RLS audit

For EACH of the 5 tables, walk USING + WITH CHECK + column GRANT from each
role separately. Be adversarial — assume a malicious caller per role.

### Role 1 — yagi_admin (is_yagi_admin(auth.uid()) TRUE)

Expected: full SELECT/INSERT/UPDATE/DELETE on every table for every column.
- campaigns: 1 admin policy per verb (4 policies). UPDATE goes through
  `campaigns_update_admin` USING + WITH CHECK both `is_yagi_admin`.
  But: REVOKE UPDATE FROM authenticated then GRANT UPDATE only on a
  subset to authenticated. Does the admin still have UPDATE? Confirm:
  (a) `is_yagi_admin` callers connect as `authenticated` role (Supabase
  PostgREST default), which means they're subject to the column-level GRANT
  too. If the admin needs to UPDATE `status`/`decision_metadata`, they MUST
  go through service-role client (which bypasses RLS AND column GRANT).
  This is the documented pattern, but verify the migration's intent matches.
- campaign_categories / campaign_review_decisions: REVOKE UPDATE FROM
  authenticated with NO column GRANT — same pattern, admin writes via
  service-role.

### Role 2 — sponsor (workspace_member of brand or artist workspace)

Expected:
- campaigns SELECT: own rows (any status) via `campaigns_select_sponsor`.
- campaigns INSERT: status='requested' AND workspace.kind IN ('brand',
  'artist') AND sponsor_workspace_id NOT NULL AND member of that workspace.
  → Confirm a `creator` workspace member is BLOCKED. (workspaces.kind
  currently allows brand/artist/yagi_admin only; 'creator' is added in
  Wave C.1. So in Wave A.1 timeframe the constraint is a no-op for creator,
  but the gate must hold once C.1 ships.)
- campaigns UPDATE: status='requested' only, member of own sponsor
  workspace. Column GRANT restricts to (title, description, brief,
  reference_assets, request_metadata, updated_at). Confirm sponsor cannot:
  (a) Self-promote status to 'draft' / 'published' (column GRANT denies
  status; WITH CHECK also denies because it requires status='requested').
  (b) Reassign sponsor_workspace_id to bypass workspace.kind gate.
  (c) Write decision_metadata.
- campaigns DELETE: denied (admin-only).
- campaign_categories: SELECT own (parent campaign sponsor_workspace_id);
  no write paths.
- campaign_submissions: SELECT own (via parent campaign sponsor_workspace_id
  match — the sponsor sees applicant submissions for their own campaign).
  No INSERT (server-action). No UPDATE.
- campaign_review_decisions: NO access at all (admin-only).
- campaign_distributions: SELECT own (via parent campaign chain). No
  write paths.

### Role 3 — applicant (workspace_member of applicant_workspace_id)

Expected:
- campaigns: SELECT only via public policy (status IN published+).
- campaign_categories: SELECT only via public policy.
- campaign_submissions: SELECT own. INSERT denied (no policy → server-action
  with service-role authors them per A.3 / C.1 design). UPDATE: column
  GRANT permits (status, title, description, content_r2_key, external_url,
  thumbnail_r2_key, duration_seconds, distributed_at, updated_at). WITH
  CHECK forces status IN whitelist {withdrawn, distributed, submitted,
  approved_for_distribution, revision_requested}. Confirm: applicant cannot
  status='approved_for_distribution' on their own (forces admin path)?
  Actually they CAN per the WITH CHECK whitelist — analyze: is this OK?
  Argue: the parent admin write that creates the original
  approved_for_distribution status is gated; the applicant changing
  status to that value on a 'submitted' row would be self-promotion.
  HIGH FOCUS — does the WITH CHECK allow self-promotion submitted →
  approved_for_distribution? If yes, this is a HIGH-B gap — proposed
  fix: tighten WITH CHECK status whitelist to {withdrawn, distributed}
  only, OR add a USING-side OLD.status check (not directly available in
  Postgres RLS WITH CHECK without trigger or composite).
- campaign_review_decisions: NO access.
- campaign_distributions: SELECT own. INSERT only when parent submission
  status='approved_for_distribution' AND member of applicant workspace.
  UPDATE: column GRANT restricts to metric columns + updated_at. WITH
  CHECK row-level only checks membership. Confirm: applicant cannot
  edit url / channel / posted_at after creation. Confirm: applicant
  cannot insert a distribution row pointing at someone else's submission
  (the workspace_member check on s.applicant_workspace_id forces own).

### Role 4 — public (anon + authenticated, no special role)

Expected:
- campaigns: SELECT status IN ('published','submission_closed',
  'distributing','archived'). No write paths.
- campaign_categories: SELECT for parent in published+ statuses.
- campaign_submissions: SELECT only when status='distributed'. Confirm
  this is intentional showcase (PRODUCT-MASTER §X comment + KICKOFF §A.3
  "distributed showcase gallery"). Public CANNOT see submitted /
  approved_for_distribution / declined / revision_requested / withdrawn
  rows.
- campaign_review_decisions: NO access (no public policy).
- campaign_distributions: SELECT only when parent submission.status =
  'distributed'.

## Adversarial focus areas

1. **INSERT path for campaigns sponsor — workspace.kind gate.** The
   policy uses `w.kind IN ('brand', 'artist')`. Today the constraint is
   `kind IN ('brand', 'artist', 'yagi_admin')`. Wave C.1 adds 'creator'.
   Confirm: when 'creator' lands, the policy correctly excludes creator
   workspaces from sponsoring. Re-read the policy text — `IN ('brand',
   'artist')` whitelist means only those two pass; 'creator' falls through
   correctly. PASS check.

2. **campaign_distributions INSERT — parent submission.status check.**
   Critical correctness: an applicant adding a distribution row MUST
   only be allowed when the parent submission has been admin-approved
   (status='approved_for_distribution'). Confirm:
   (a) The EXISTS subquery joins campaign_submissions s ON
       s.id = campaign_distributions.submission_id AND s.status =
       'approved_for_distribution'. ✓
   (b) Race condition: if admin reverts a submission from
       approved_for_distribution → declined while the applicant is
       INSERTing, the INSERT will fail (row state at the time of CHECK).
       This is correct — no race vulnerability.
   (c) Cross-workspace: workspace_members JOIN ON s.applicant_workspace_id
       guarantees the inserter is the applicant. ✓.

3. **campaign_submissions status transition guard.**
   Builder pre-hardened with TWO defenses-in-depth:
   (a) RLS WITH CHECK on `campaign_submissions_update_applicant`
       restricts the resulting status to {withdrawn, distributed} only.
   (b) BEFORE UPDATE OF status TRIGGER
       `campaign_submissions_guard_status_transition` (SECURITY DEFINER,
       search_path pinned) enforces source-state preconditions:
         - auth.uid() IS NULL (service-role / direct DB) → bypass
         - is_yagi_admin(uid) → bypass
         - else: only `any → 'withdrawn'` and
                 `'approved_for_distribution' → 'distributed'` permitted
       Pattern matches Phase 4-x sub_03g F2 trigger.

   Confirm:
   - Trigger correctly catches the 'submitted' → 'distributed' bypass
     (applicant cannot skip admin approval).
   - SECURITY DEFINER + search_path pin + REVOKE ALL FROM PUBLIC closes
     escalation paths.
   - Trigger fires `BEFORE UPDATE OF status` (not all UPDATE), so
     non-status updates (e.g., title via column GRANT) don't pay the
     cost.
   - Edge case: an applicant updates BOTH status AND another column in
     one UPDATE — the trigger fires on status, RLS WITH CHECK runs on
     post-update row, both apply.
   - Edge case: 'withdrawn' is reachable from any prior status by the
     applicant — including 'distributed' (already public). Argue: this
     is intentional (applicant retraction); admin can re-state if
     needed.

4. **Status enum coverage.** Verify all CHECK constraint values are valid:
   - campaigns.status: {requested, in_review, declined, draft, published,
     submission_closed, distributing, archived} = 8. ✓
   - campaign_submissions.status: {submitted, approved_for_distribution,
     declined, revision_requested, distributed, withdrawn} = 6. ✓
   - campaign_review_decisions.decision: {approved, declined,
     revision_requested} = 3. ✓
   - campaign_distributions.channel: {tiktok, instagram, youtube,
     youtube_shorts, x, other} = 6. ✓
   - campaigns.compensation_model: {exposure_only, fixed_fee,
     royalty_share} = 3. ✓
   No drift from PRODUCT-MASTER §X.

5. **yagi-wording-rules check on COMMENT ON statements.** PRODUCT-MASTER
   §M v1.3 forbids internal-only English terms (Sponsor / Submission /
   Track / Roster / Distribution) on UI surface. Comments in migrations
   are operator-facing schema docs, not UI surface. Confirm the table
   COMMENT ON statements only use these terms in technical schema-doc
   context (KO acceptable, EN allowed for technical clarity). Spot-check
   the 5 COMMENT ON TABLE statements.

6. **public-read scope for distributions.** Policy:
   `EXISTS (campaign_submissions s WHERE s.id = ... AND s.status =
   'distributed')`. Confirm:
   (a) The EXISTS subquery does not bypass the campaign_submissions
       SELECT policy because `EXISTS` in RLS USING evaluates as the
       table-owning role (postgres), not as the caller. So the public
       can read the distribution row even though they may not be able
       to read the submission row directly. This is INTENTIONAL — the
       public showcase gallery shows distributions where parent is
       'distributed' (matching the campaign_submissions public policy
       for status='distributed'). PASS check.
   (b) But: public can read distribution rows whose parent submission
       has status='distributed', regardless of whether parent campaign
       has status published+. Edge case: an admin sets a campaign back
       to 'draft' but a submission is already 'distributed' — does the
       public still see the distribution row? Argue: distribution is
       the durable artifact; campaign archival shouldn't hide it.
       Confirm intent matches.

7. **FK ON DELETE behaviors.** Per migration:
   - campaigns ← categories: ON DELETE CASCADE
   - campaigns ← submissions: ON DELETE CASCADE
   - submissions ← reviews: ON DELETE CASCADE
   - submissions ← distributions: ON DELETE CASCADE
   - submissions.applicant_workspace_id → workspaces: ON DELETE SET NULL
   - campaigns.sponsor_workspace_id → workspaces: NO ACTION (default)
   - campaigns.created_by → profiles: NO ACTION (default)
   - reviews.reviewer_user_id → profiles: NO ACTION (default)
   - distributions.added_by → profiles: NO ACTION (default; nullable)
   Confirm intent:
   (a) Deleting a workspace nulls out applicant_workspace_id (preserves
       submission history). ✓
   (b) Deleting a workspace fails if it's referenced as
       sponsor_workspace_id on any campaign (NO ACTION). ⚠ Argue: is
       this the right semantic? If a brand workspace is deleted, all
       their campaigns become orphaned. Phase 7 lock: workspaces are
       soft-deleted via admin tooling, not hard-deleted. NO ACTION
       forces an explicit cleanup decision. PASS — but flag if Phase 8
       admin tooling needs ON DELETE CASCADE.
   (c) Deleting a profile fails if it's referenced as created_by on a
       campaign or reviewer_user_id on a review. NO ACTION. Same
       reasoning as (b).
   (d) FK actions on PG default for campaigns ← submissions etc are
       documented inline — re-read to ensure CASCADE is explicit. ✓.

8. **DO-block self-asserts coverage.** The DO block at the end asserts:
   (a) No table-level UPDATE for authenticated on any of 5 tables.
   (b) campaigns granted columns = TRUE; admin-only columns = FALSE.
   (c) campaign_categories: no UPDATE on any column.
   (d) campaign_submissions: granted = TRUE; admin-only = FALSE.
   (e) campaign_review_decisions: no UPDATE on any column.
   (f) campaign_distributions: granted (metric) = TRUE; admin-only =
       FALSE.
   Confirm completeness: every column in the 5 tables falls into one of
   the two buckets and is asserted. Anything missed?

9. **Trigger coverage.** updated_at trigger applied to campaigns,
   campaign_submissions, campaign_distributions. Categories and reviews
   have no updated_at column → no trigger. ✓.

10. **Unique constraints.** campaigns.slug UNIQUE — what's the slug
    generation policy? Server actions (A.2) own this. Confirm migration
    enforces UNIQUE. ✓. Possible enhancement: add a CHECK on slug format
    (kebab-case-only). Defer if not in PRODUCT-MASTER §X.

11. **Index coverage for hot RLS predicates.** RLS predicates use
    EXISTS subqueries on workspace_members.workspace_id + user_id and
    on campaigns.id / campaign_submissions.id / sponsor_workspace_id.
    Confirm:
    (a) workspace_members has (workspace_id, user_id) index — assumed
        from prior phases, confirm.
    (b) idx_campaigns_sponsor_workspace covers sponsor lookups. ✓
    (c) idx_campaign_submissions_applicant covers applicant lookups. ✓
    (d) Foreign keys auto-index in some configs but not Postgres by
        default. campaign_categories.campaign_id: idx ✓.
        campaign_submissions.campaign_id: ✓. campaign_submissions.
        category_id: NO INDEX. campaign_distributions.submission_id: ✓.
        campaign_review_decisions.submission_id: ✓.
    Flag missing index on campaign_submissions.category_id if it would
    be queried in admin review tool (A.3 / D.1) — likely yes.
    MED-A or LOW.

## Already-deferred (do NOT flag)

- Compensation 정산 logic (Phase 11)
- Roster funnel UI (Phase 8)
- Challenge MVP / coexistence with `challenges` table (Phase 9 optional)
- Distribution metric API auto-fetch (Phase 8)
- Server actions for campaigns CRUD (A.2 — separate review wave)
- Public landing UI (A.3 — separate review wave)
- Sponsor request form + admin queue (Wave B — separate review)
- Auto magic-link creator workspace (Wave C — separate review)
- Admin review tool (Wave D — separate review)

## Output format

## VERDICT: <CLEAN | NEEDS-ATTENTION>

For each NEW finding:
[FINDING N] CLASS: file:line — short description — recommended fix

Severity guide:
- HIGH-A = clear path to anyone-bypasses-anyone or anyone-deletes-anyone.
  Inline fix mandatory.
- HIGH-B = subtle gap that gives unauthorized access under specific
  scenarios (e.g., self-promotion of submission status). Inline fix
  mandatory.
- MED-A = auto-fixable issue that doesn't expand attack surface
  (e.g., missing FK index, missing assertion). Builder inline fix.
- MED-B/C = scale-aware (<100 user). FU register acceptable.
- LOW = polish; FU only.

If 0 NEW HIGH/MED findings: "VERDICT: CLEAN — Wave A.1 ready for
mcp.apply_migration."

End with one-line summary.
