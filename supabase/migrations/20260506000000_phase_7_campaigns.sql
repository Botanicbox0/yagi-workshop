-- Phase 7 Wave A.1 — Distributed Campaign schema (5 tables) + RLS + column
-- grant lockdown.
--
-- Source-of-truth:
--   .yagi-autobuild/PRODUCT-MASTER.md §X (5 tables, verbatim DDL)
--   .yagi-autobuild/phase-7/KICKOFF.md §"A.1 — Schema migration" (RLS verbatim)
--
-- Phase 7 PIVOT context (PRODUCT-MASTER §W, v1.6, locked 2026-05-05):
-- The Phase 2.5 `challenges` / `challenge_submissions` / `challenge_judgings` /
-- `challenge_awards` tables remain in place (untouched). This migration adds
-- a parallel set of 5 NEW tables that model the Distributed Campaign workflow:
-- sponsor (brand or artist workspace) hosts a campaign → curated creator pool
-- submits work → admin reviews → approved creators self-distribute on their
-- channels (TikTok / IG / YouTube / etc.) → manual metric log. The Distributed
-- Campaign is the strategic primary; `challenges` (KAICF-style contest) is
-- deferred to optional Phase 9.
--
-- L-019 pre-flight (verified 2026-05-05 via mcp.execute_sql):
--   - campaigns: 0 rows / table absent
--   - campaign_categories: table absent
--   - campaign_submissions: table absent
--   - campaign_review_decisions: table absent
--   - campaign_distributions: table absent
--   - workspaces WHERE kind = 'brand': 7 rows (sponsor candidates exist)
--   No backfill / data-migration required.
--
-- L-049 4-perspective audit (binding from codex-review-protocol.md):
--   1. yagi_admin (is_yagi_admin(auth.uid()) TRUE) — full RLS access on every
--      table, all verbs. Service-role tooling for admin-write columns
--      (status, decision_metadata, sponsor_workspace_id, has_external_sponsor,
--      external_sponsor_name on campaigns; status reviewer_user_id on review
--      decisions, etc.).
--   2. sponsor (brand or artist workspace member) — campaigns: SELECT own,
--      INSERT status='requested' only with workspace.kind IN ('brand','artist'),
--      UPDATE own status='requested' only on (title/description/brief/
--      reference_assets/request_metadata/updated_at). Campaign_categories /
--      submissions / reviews / distributions: SELECT own (via parent campaign
--      sponsor_workspace_id), no write paths (admin-only or applicant-only).
--   3. applicant (workspace_member of applicant_workspace_id, possibly newly
--      auto-created creator workspace) — campaign_submissions: SELECT own,
--      no direct INSERT (server action via service-role); UPDATE own restricted
--      to status transitions (→ 'withdrawn' or → 'distributed'). Distributions:
--      SELECT own, INSERT only when parent submission.status =
--      'approved_for_distribution', UPDATE only on metric columns.
--   4. public (anon + authenticated) — campaigns: SELECT status IN
--      ('published','submission_closed','distributing','archived').
--      Categories: SELECT for parent campaign in published+ statuses.
--      Submissions: SELECT only when status='distributed'. Distributions:
--      SELECT only when parent submission.status='distributed'. Reviews:
--      no public access ever.
--
-- yagi-wording-rules cross-check (PRODUCT-MASTER §M v1.3):
--   Internal-only English terms (Sponsor / Submission / Track / Roster /
--   Distribution) are NOT exposed in COMMENT ON statements that surface as
--   user-facing copy. Comments here are operator-facing schema docs; KO + EN
--   technical terminology mixed for clarity is acceptable per §M scope
--   (worksheet rules govern UI surface, not migration comments).

-- ===========================================================================
-- 1. campaigns
-- ===========================================================================

CREATE TABLE campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  brief text,
  reference_assets jsonb,
  -- Sponsor identity (NULL = admin self-host / Route A)
  sponsor_workspace_id uuid REFERENCES workspaces(id),
  has_external_sponsor boolean NOT NULL DEFAULT false,
  external_sponsor_name text,
  -- Workflow status (8-state Distributed Campaign lifecycle)
  status text NOT NULL DEFAULT 'draft' CHECK (status IN (
    'requested', 'in_review', 'declined',
    'draft', 'published', 'submission_closed',
    'distributing', 'archived'
  )),
  submission_open_at timestamptz,
  submission_close_at timestamptz,
  distribution_starts_at timestamptz,
  -- File policy (admin publish 시점 결정)
  allow_r2_upload boolean NOT NULL DEFAULT true,
  allow_external_url boolean NOT NULL DEFAULT true,
  -- Compensation (정산 = Phase 11)
  compensation_model text CHECK (compensation_model IN (
    'exposure_only', 'fixed_fee', 'royalty_share'
  )) DEFAULT 'exposure_only',
  compensation_metadata jsonb,
  -- Meta
  created_by uuid NOT NULL REFERENCES profiles(id),
  request_metadata jsonb,
  decision_metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE campaigns IS
  'Phase 7 Distributed Campaign — sponsor (brand/artist workspace or admin '
  'self-host) hosts a creator-pool campaign. 8-state status lifecycle: '
  'requested/in_review/declined (sponsor request flow) → draft/published/'
  'submission_closed/distributing/archived (admin publish flow). Status / '
  'decision_metadata / sponsor_workspace_id / has_external_sponsor / '
  'external_sponsor_name are admin-write only via column-level GRANT lockdown.';

CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_sponsor_workspace ON campaigns(sponsor_workspace_id)
  WHERE sponsor_workspace_id IS NOT NULL;
CREATE INDEX idx_campaigns_published ON campaigns(submission_open_at DESC)
  WHERE status IN ('published', 'submission_closed', 'distributing', 'archived');

-- ===========================================================================
-- 2. campaign_categories
-- ===========================================================================

CREATE TABLE campaign_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  format_spec jsonb,
  display_order int NOT NULL DEFAULT 0
);

COMMENT ON TABLE campaign_categories IS
  'Phase 7 — 참여 부문 per campaign (e.g., "리믹스 영상", "AI 뮤비 단편"). '
  'format_spec captures orientation/duration_max constraints. yagi_admin write, '
  'public read for parent campaign in published+ statuses.';

CREATE INDEX idx_campaign_categories_campaign ON campaign_categories(campaign_id);

-- ===========================================================================
-- 3. campaign_submissions
-- ===========================================================================

CREATE TABLE campaign_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES campaign_categories(id),
  applicant_workspace_id uuid REFERENCES workspaces(id) ON DELETE SET NULL,
  applicant_email text NOT NULL,
  applicant_name text NOT NULL,
  applicant_phone text,
  team_name text,
  -- 작품
  title text NOT NULL,
  description text,
  content_r2_key text,
  external_url text,
  thumbnail_r2_key text,
  duration_seconds int,
  -- Workflow status (6-state)
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN (
    'submitted',
    'approved_for_distribution',
    'declined',
    'revision_requested',
    'distributed',
    'withdrawn'
  )),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  declined_at timestamptz,
  distributed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE campaign_submissions IS
  'Phase 7 — creator 응모작 entry (single review round). 6-state: submitted → '
  'approved_for_distribution / declined / revision_requested → distributed / '
  'withdrawn. applicant_workspace_id ON DELETE SET NULL preserves submission '
  'history if creator workspace is later deleted (admin reconciliation).';

CREATE INDEX idx_campaign_submissions_campaign ON campaign_submissions(campaign_id);
CREATE INDEX idx_campaign_submissions_category ON campaign_submissions(category_id);
CREATE INDEX idx_campaign_submissions_applicant ON campaign_submissions(applicant_workspace_id)
  WHERE applicant_workspace_id IS NOT NULL;
CREATE INDEX idx_campaign_submissions_status ON campaign_submissions(status);

-- ===========================================================================
-- 4. campaign_review_decisions
-- ===========================================================================

CREATE TABLE campaign_review_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES campaign_submissions(id) ON DELETE CASCADE,
  reviewer_user_id uuid NOT NULL REFERENCES profiles(id),
  decision text NOT NULL CHECK (decision IN (
    'approved', 'declined', 'revision_requested'
  )),
  comment text,
  decided_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE campaign_review_decisions IS
  'Phase 7 — yagi_admin 검수 audit trail (single round). All RLS verbs '
  'restricted to yagi_admin only — no sponsor / applicant / public access.';

CREATE INDEX idx_campaign_review_decisions_submission ON campaign_review_decisions(submission_id);

-- ===========================================================================
-- 5. campaign_distributions
-- ===========================================================================

CREATE TABLE campaign_distributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES campaign_submissions(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN (
    'tiktok', 'instagram', 'youtube', 'youtube_shorts', 'x', 'other'
  )),
  url text NOT NULL,
  posted_at timestamptz NOT NULL DEFAULT now(),
  -- Metric (Phase 7 MVP = manual log; API auto-fetch = Phase 8)
  view_count bigint,
  like_count bigint,
  comment_count bigint,
  metric_logged_at timestamptz,
  metric_log_notes text,
  -- Meta
  added_by uuid REFERENCES profiles(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE campaign_distributions IS
  'Phase 7 NEW — creator 본인 채널 유포 metadata + manual metric log. INSERT '
  'gated by parent submission.status = ''approved_for_distribution''. '
  'view_count / like_count / comment_count / metric_logged_at / '
  'metric_log_notes are the only non-admin updatable columns (column-level '
  'GRANT lockdown).';

CREATE INDEX idx_campaign_distributions_submission ON campaign_distributions(submission_id);
CREATE INDEX idx_campaign_distributions_channel ON campaign_distributions(channel);

-- ===========================================================================
-- updated_at triggers
-- ===========================================================================

CREATE OR REPLACE FUNCTION campaigns_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION campaigns_set_updated_at();

CREATE TRIGGER campaign_submissions_updated_at
  BEFORE UPDATE ON campaign_submissions
  FOR EACH ROW EXECUTE FUNCTION campaigns_set_updated_at();

CREATE TRIGGER campaign_distributions_updated_at
  BEFORE UPDATE ON campaign_distributions
  FOR EACH ROW EXECUTE FUNCTION campaigns_set_updated_at();

-- ===========================================================================
-- campaign_submissions status transition guard (defense-in-depth)
--
-- RLS WITH CHECK cannot reference OLD.status. Without an OLD-aware guard,
-- an applicant could self-promote a 'submitted' row directly to
-- 'distributed' (bypassing admin review) and trigger the public showcase
-- policy `campaign_submissions_select_public USING status='distributed'`.
--
-- This trigger enforces legal applicant-driven transitions:
--   - any → 'withdrawn'                            (applicant withdraws)
--   - 'approved_for_distribution' → 'distributed'  (applicant marks own
--                                                   submission as posted)
-- Other transitions are reserved for admin.
--
-- Bypass pattern (matches Phase 4-x sub_03g F2 / Phase 2.7 commission
-- soft launch):
--   - auth.uid() IS NULL  → service_role / direct DB sessions (trusted)
--   - is_yagi_admin(uid)  → admin path (full transition authority)
--   - else                → applicant path, restricted to 2 transitions
-- SECURITY DEFINER so the inner is_yagi_admin call resolves correctly
-- regardless of the caller's GUC role and search_path is pinned.
-- ===========================================================================

CREATE OR REPLACE FUNCTION campaign_submissions_guard_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller uuid := auth.uid();
BEGIN
  -- No-op when status is unchanged
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  -- Service-role / direct DB session bypass — trusted contexts.
  IF v_caller IS NULL THEN
    RETURN NEW;
  END IF;

  -- yagi_admin authenticated path: full transition authority
  IF public.is_yagi_admin(v_caller) THEN
    RETURN NEW;
  END IF;

  -- Applicant path: only 2 legal transitions
  --   any → 'withdrawn'
  --   'approved_for_distribution' → 'distributed'
  IF NEW.status = 'withdrawn' THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'distributed' AND OLD.status = 'approved_for_distribution' THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION
    'cannot self-change campaign_submissions status from % to % (admin-only transition)',
    OLD.status, NEW.status
    USING ERRCODE = '42501';
END $$;

REVOKE ALL ON FUNCTION public.campaign_submissions_guard_status_transition() FROM PUBLIC;

COMMENT ON FUNCTION public.campaign_submissions_guard_status_transition() IS
  'Phase 7 Wave A.1: enforces legal applicant-driven transitions on '
  'campaign_submissions.status (any → withdrawn; '
  'approved_for_distribution → distributed). service_role + yagi_admin '
  'bypass. Matches Phase 4-x sub_03g F2 trigger pattern.';

CREATE TRIGGER campaign_submissions_status_guard
  BEFORE UPDATE OF status ON campaign_submissions
  FOR EACH ROW EXECUTE FUNCTION campaign_submissions_guard_status_transition();

-- ===========================================================================
-- Enable RLS on all 5 tables
-- ===========================================================================

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_review_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_distributions ENABLE ROW LEVEL SECURITY;

-- ===========================================================================
-- campaigns RLS
-- ===========================================================================

-- SELECT (3 policies, OR-combined per Postgres default)

-- 1. yagi_admin: all rows
CREATE POLICY campaigns_select_admin ON campaigns
  FOR SELECT TO authenticated
  USING (public.is_yagi_admin(auth.uid()));

-- 2. sponsor (workspace_member of sponsor_workspace_id): own rows (any status)
CREATE POLICY campaigns_select_sponsor ON campaigns
  FOR SELECT TO authenticated
  USING (
    sponsor_workspace_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = campaigns.sponsor_workspace_id
        AND wm.user_id = auth.uid()
    )
  );

-- 3. public (anon + authenticated): published-or-later statuses
CREATE POLICY campaigns_select_public ON campaigns
  FOR SELECT TO anon, authenticated
  USING (status IN ('published', 'submission_closed', 'distributing', 'archived'));

-- INSERT (2 policies)

-- 1. yagi_admin: any status
CREATE POLICY campaigns_insert_admin ON campaigns
  FOR INSERT TO authenticated
  WITH CHECK (public.is_yagi_admin(auth.uid()));

-- 2. sponsor: status='requested' only + workspace.kind IN ('brand','artist')
-- K-05 LOOP-1 F1 HIGH-B fix: column-level INSERT GRANT below restricts the
-- columns sponsor can supply. WITH CHECK additionally forces
-- created_by = auth.uid() so a sponsor cannot forge another user's authorship,
-- and asserts the admin/audit fields stay at their NOT-NULL DEFAULTs / NULLs.
CREATE POLICY campaigns_insert_sponsor ON campaigns
  FOR INSERT TO authenticated
  WITH CHECK (
    status = 'requested'
    AND created_by = auth.uid()
    AND sponsor_workspace_id IS NOT NULL
    AND has_external_sponsor IS NOT DISTINCT FROM false
    AND external_sponsor_name IS NULL
    AND decision_metadata IS NULL
    AND submission_open_at IS NULL
    AND submission_close_at IS NULL
    AND distribution_starts_at IS NULL
    AND EXISTS (
      SELECT 1 FROM workspace_members wm
      JOIN workspaces w ON w.id = wm.workspace_id
      WHERE wm.workspace_id = campaigns.sponsor_workspace_id
        AND wm.user_id = auth.uid()
        AND w.kind IN ('brand', 'artist')
    )
  );

-- UPDATE (2 policies)

-- 1. yagi_admin: any status / any column
CREATE POLICY campaigns_update_admin ON campaigns
  FOR UPDATE TO authenticated
  USING (public.is_yagi_admin(auth.uid()))
  WITH CHECK (public.is_yagi_admin(auth.uid()));

-- 2. sponsor: status='requested' only (admin 검토 진입 전)
-- Column-level GRANT (below) restricts the columns the sponsor can change.
CREATE POLICY campaigns_update_sponsor ON campaigns
  FOR UPDATE TO authenticated
  USING (
    status = 'requested'
    AND sponsor_workspace_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = campaigns.sponsor_workspace_id
        AND wm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    status = 'requested'
    AND sponsor_workspace_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = campaigns.sponsor_workspace_id
        AND wm.user_id = auth.uid()
    )
  );

-- DELETE (1 policy)

CREATE POLICY campaigns_delete_admin ON campaigns
  FOR DELETE TO authenticated
  USING (public.is_yagi_admin(auth.uid()));

-- Column-level GRANT lockdown for campaigns
-- Sponsor (authenticated) is restricted to (title, description, brief,
-- reference_assets, request_metadata, updated_at). Status / decision_metadata /
-- sponsor_workspace_id / has_external_sponsor / external_sponsor_name /
-- compensation_* / submission_*_at / distribution_starts_at / allow_*  are
-- admin-write only via service-role.
REVOKE UPDATE ON campaigns FROM authenticated;
GRANT UPDATE (title, description, brief, reference_assets, request_metadata, updated_at)
  ON campaigns TO authenticated;

-- K-05 LOOP-1 F1 HIGH-B fix: Column-level INSERT lockdown.
-- The campaigns_insert_sponsor RLS policy alone is row-gated but column-open;
-- a sponsor could seed admin/audit columns (decision_metadata,
-- has_external_sponsor, compensation_*, allow_*, dates) at INSERT time.
-- Restrict authenticated INSERT to the safe sponsor-request column set; admin
-- writes go through service-role and bypass this GRANT.
REVOKE INSERT ON campaigns FROM authenticated;
GRANT INSERT (
  slug, title, description, brief, reference_assets,
  sponsor_workspace_id, status, request_metadata, created_by, updated_at
) ON campaigns TO authenticated;

-- ===========================================================================
-- campaign_categories RLS
-- ===========================================================================

-- SELECT (3 policies)

-- 1. yagi_admin
CREATE POLICY campaign_categories_select_admin ON campaign_categories
  FOR SELECT TO authenticated
  USING (public.is_yagi_admin(auth.uid()));

-- 2. sponsor own (parent campaign sponsor_workspace_id)
CREATE POLICY campaign_categories_select_sponsor ON campaign_categories
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      JOIN workspace_members wm ON wm.workspace_id = c.sponsor_workspace_id
      WHERE c.id = campaign_categories.campaign_id
        AND wm.user_id = auth.uid()
    )
  );

-- 3. public for parent campaign in published+ statuses
CREATE POLICY campaign_categories_select_public ON campaign_categories
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_categories.campaign_id
        AND c.status IN ('published', 'submission_closed', 'distributing', 'archived')
    )
  );

-- INSERT / UPDATE / DELETE: yagi_admin only

CREATE POLICY campaign_categories_insert_admin ON campaign_categories
  FOR INSERT TO authenticated
  WITH CHECK (public.is_yagi_admin(auth.uid()));

CREATE POLICY campaign_categories_update_admin ON campaign_categories
  FOR UPDATE TO authenticated
  USING (public.is_yagi_admin(auth.uid()))
  WITH CHECK (public.is_yagi_admin(auth.uid()));

CREATE POLICY campaign_categories_delete_admin ON campaign_categories
  FOR DELETE TO authenticated
  USING (public.is_yagi_admin(auth.uid()));

-- Column-level GRANT lockdown: authenticated has no UPDATE on any column.
-- Supabase grants default INSERT/UPDATE/DELETE at schema level for the
-- authenticated role; without explicit REVOKE, has_table_privilege returns
-- TRUE for INSERT even though the RLS policy denies it. REVOKE INSERT here
-- so the DO-block self-asserts pass on apply.
REVOKE INSERT, UPDATE, DELETE ON campaign_categories FROM authenticated;

-- ===========================================================================
-- campaign_submissions RLS
-- ===========================================================================

-- SELECT (4 policies)

-- 1. yagi_admin
CREATE POLICY campaign_submissions_select_admin ON campaign_submissions
  FOR SELECT TO authenticated
  USING (public.is_yagi_admin(auth.uid()));

-- 2. own applicant (workspace_member of applicant_workspace_id)
CREATE POLICY campaign_submissions_select_applicant ON campaign_submissions
  FOR SELECT TO authenticated
  USING (
    applicant_workspace_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = campaign_submissions.applicant_workspace_id
        AND wm.user_id = auth.uid()
    )
  );

-- 3. sponsor own (parent campaign sponsor_workspace_id)
CREATE POLICY campaign_submissions_select_sponsor ON campaign_submissions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      JOIN workspace_members wm ON wm.workspace_id = c.sponsor_workspace_id
      WHERE c.id = campaign_submissions.campaign_id
        AND wm.user_id = auth.uid()
    )
  );

-- 4. public for status='distributed' (showcase gallery)
CREATE POLICY campaign_submissions_select_public ON campaign_submissions
  FOR SELECT TO anon, authenticated
  USING (status = 'distributed');

-- INSERT: server action only (service-role) — no RLS policy. With RLS enabled
-- and no INSERT policy, all direct INSERTs from anon/authenticated are denied.

-- UPDATE (2 policies)

-- 1. yagi_admin: any column / any row
CREATE POLICY campaign_submissions_update_admin ON campaign_submissions
  FOR UPDATE TO authenticated
  USING (public.is_yagi_admin(auth.uid()))
  WITH CHECK (public.is_yagi_admin(auth.uid()));

-- 2. own applicant: limited transitions only.
-- Legit applicant-initiated transitions (per KICKOFF §C.3 / §B):
--   - any status → 'withdrawn' (applicant withdraws)
--   - 'approved_for_distribution' → 'distributed' (applicant marks own
--     submission as posted to their channel; campaign_distributions
--     INSERT path takes it from there)
-- WITH CHECK enforces the resulting status is in {withdrawn, distributed}
-- only. Combined with the column-level GRANT permitting status writes,
-- this prevents self-promotion to approved_for_distribution / declined /
-- revision_requested (admin-only transitions). Postgres RLS does not
-- expose OLD.status in WITH CHECK; the server-action layer in Wave C is
-- responsible for enforcing the source-state preconditions. RLS here is
-- defense-in-depth: even if the action layer is compromised, the
-- applicant cannot arbitrarily promote.
CREATE POLICY campaign_submissions_update_applicant ON campaign_submissions
  FOR UPDATE TO authenticated
  USING (
    applicant_workspace_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = campaign_submissions.applicant_workspace_id
        AND wm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    applicant_workspace_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = campaign_submissions.applicant_workspace_id
        AND wm.user_id = auth.uid()
    )
    AND status IN ('withdrawn', 'distributed')
  );

-- DELETE: yagi_admin only
CREATE POLICY campaign_submissions_delete_admin ON campaign_submissions
  FOR DELETE TO authenticated
  USING (public.is_yagi_admin(auth.uid()));

-- Column-level GRANT lockdown for campaign_submissions
-- Applicant can update: status (limited transitions via WITH CHECK above),
-- title, description, content_r2_key, external_url, thumbnail_r2_key,
-- duration_seconds, distributed_at, updated_at. Cannot update:
-- campaign_id / category_id / applicant_workspace_id / applicant_email /
-- applicant_name / applicant_phone / team_name / submitted_at / approved_at /
-- declined_at (admin-write only). status is included so the applicant can
-- self-withdraw or self-mark-distributed; the WITH CHECK restricts to
-- whitelist.
REVOKE UPDATE ON campaign_submissions FROM authenticated;
GRANT UPDATE (status, title, description, content_r2_key, external_url, thumbnail_r2_key, duration_seconds, distributed_at, updated_at)
  ON campaign_submissions TO authenticated;
-- Supabase default-INSERT REVOKE: server-action only (service-role bypasses
-- this REVOKE; authenticated client cannot INSERT directly).
REVOKE INSERT, DELETE ON campaign_submissions FROM authenticated;

-- ===========================================================================
-- campaign_review_decisions RLS — yagi_admin only on every verb
-- ===========================================================================

CREATE POLICY campaign_review_decisions_select_admin ON campaign_review_decisions
  FOR SELECT TO authenticated
  USING (public.is_yagi_admin(auth.uid()));

CREATE POLICY campaign_review_decisions_insert_admin ON campaign_review_decisions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_yagi_admin(auth.uid()));

CREATE POLICY campaign_review_decisions_update_admin ON campaign_review_decisions
  FOR UPDATE TO authenticated
  USING (public.is_yagi_admin(auth.uid()))
  WITH CHECK (public.is_yagi_admin(auth.uid()));

CREATE POLICY campaign_review_decisions_delete_admin ON campaign_review_decisions
  FOR DELETE TO authenticated
  USING (public.is_yagi_admin(auth.uid()));

-- Column-level GRANT lockdown: authenticated has no UPDATE on any column.
-- Supabase default-INSERT REVOKE: yagi_admin only via service-role.
REVOKE INSERT, UPDATE, DELETE ON campaign_review_decisions FROM authenticated;

-- ===========================================================================
-- campaign_distributions RLS
-- ===========================================================================

-- SELECT (3 policies)

-- 1. yagi_admin
CREATE POLICY campaign_distributions_select_admin ON campaign_distributions
  FOR SELECT TO authenticated
  USING (public.is_yagi_admin(auth.uid()));

-- 2. own applicant (parent submission applicant_workspace_id)
CREATE POLICY campaign_distributions_select_applicant ON campaign_distributions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaign_submissions s
      JOIN workspace_members wm ON wm.workspace_id = s.applicant_workspace_id
      WHERE s.id = campaign_distributions.submission_id
        AND wm.user_id = auth.uid()
    )
  );

-- 3. sponsor own (parent campaign sponsor_workspace_id via submission)
CREATE POLICY campaign_distributions_select_sponsor ON campaign_distributions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaign_submissions s
      JOIN campaigns c ON c.id = s.campaign_id
      JOIN workspace_members wm ON wm.workspace_id = c.sponsor_workspace_id
      WHERE s.id = campaign_distributions.submission_id
        AND wm.user_id = auth.uid()
    )
  );

-- 4. public for parent submission status='distributed'
CREATE POLICY campaign_distributions_select_public ON campaign_distributions
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaign_submissions s
      WHERE s.id = campaign_distributions.submission_id
        AND s.status = 'distributed'
    )
  );

-- INSERT (2 policies)

-- 1. yagi_admin: always
CREATE POLICY campaign_distributions_insert_admin ON campaign_distributions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_yagi_admin(auth.uid()));

-- 2. own applicant: only when parent submission.status='approved_for_distribution'
-- K-05 LOOP-1 F2 MED-A fix: INSERT column GRANT below restricts forgery of
-- audit fields. WITH CHECK additionally forces added_by = auth.uid() so the
-- applicant identity is bound to the inserter.
CREATE POLICY campaign_distributions_insert_applicant ON campaign_distributions
  FOR INSERT TO authenticated
  WITH CHECK (
    added_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM campaign_submissions s
      JOIN workspace_members wm ON wm.workspace_id = s.applicant_workspace_id
      WHERE s.id = campaign_distributions.submission_id
        AND wm.user_id = auth.uid()
        AND s.status = 'approved_for_distribution'
    )
  );

-- UPDATE (2 policies)

-- 1. yagi_admin: any column / any row
CREATE POLICY campaign_distributions_update_admin ON campaign_distributions
  FOR UPDATE TO authenticated
  USING (public.is_yagi_admin(auth.uid()))
  WITH CHECK (public.is_yagi_admin(auth.uid()));

-- 2. own applicant: metric fields only (column-level GRANT enforces; row-level
-- USING/CHECK ensures the row belongs to the applicant)
CREATE POLICY campaign_distributions_update_applicant ON campaign_distributions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaign_submissions s
      JOIN workspace_members wm ON wm.workspace_id = s.applicant_workspace_id
      WHERE s.id = campaign_distributions.submission_id
        AND wm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaign_submissions s
      JOIN workspace_members wm ON wm.workspace_id = s.applicant_workspace_id
      WHERE s.id = campaign_distributions.submission_id
        AND wm.user_id = auth.uid()
    )
  );

-- DELETE: yagi_admin only
CREATE POLICY campaign_distributions_delete_admin ON campaign_distributions
  FOR DELETE TO authenticated
  USING (public.is_yagi_admin(auth.uid()));

-- Column-level GRANT lockdown for campaign_distributions
-- Applicant can update: view_count, like_count, comment_count, metric_logged_at,
-- metric_log_notes, updated_at. Cannot update: submission_id / channel / url /
-- posted_at / added_by / notes / created_at (admin-write only).
REVOKE UPDATE ON campaign_distributions FROM authenticated;
GRANT UPDATE (view_count, like_count, comment_count, metric_logged_at, metric_log_notes, updated_at)
  ON campaign_distributions TO authenticated;

-- K-05 LOOP-1 F2 MED-A fix: Column-level INSERT lockdown for applicant
-- distribution registration. Applicant should provide submission_id, channel,
-- url, posted_at, added_by (= self), and optional notes. Admin/audit fields
-- (metric_*, created_at, updated_at) get DEFAULTs and are not seedable.
REVOKE INSERT ON campaign_distributions FROM authenticated;
GRANT INSERT (
  submission_id, channel, url, posted_at, added_by, notes
) ON campaign_distributions TO authenticated;

-- ===========================================================================
-- DO-block self-asserts (sub_5 / Phase 6 hardening pattern)
--
-- Fail apply if the column-level GRANT matrix has drifted from the intent.
-- Asserts the 4 invariants per L-049 audit:
--   (a) authenticated has NO table-level UPDATE on any of the 5 tables
--   (b) granted columns return TRUE for has_column_privilege
--   (c) admin-only columns return FALSE for has_column_privilege
--   (d) campaign_categories / campaign_review_decisions: NO UPDATE on any
-- ===========================================================================

DO $$
BEGIN
  -- ----- (a) No table-level UPDATE for authenticated on any of the 5 tables
  IF has_table_privilege('authenticated', 'public.campaigns', 'UPDATE') THEN
    RAISE EXCEPTION 'assert failed: authenticated has table-level UPDATE on campaigns';
  END IF;
  IF has_table_privilege('authenticated', 'public.campaign_categories', 'UPDATE') THEN
    RAISE EXCEPTION 'assert failed: authenticated has table-level UPDATE on campaign_categories';
  END IF;
  IF has_table_privilege('authenticated', 'public.campaign_submissions', 'UPDATE') THEN
    RAISE EXCEPTION 'assert failed: authenticated has table-level UPDATE on campaign_submissions';
  END IF;
  IF has_table_privilege('authenticated', 'public.campaign_review_decisions', 'UPDATE') THEN
    RAISE EXCEPTION 'assert failed: authenticated has table-level UPDATE on campaign_review_decisions';
  END IF;
  IF has_table_privilege('authenticated', 'public.campaign_distributions', 'UPDATE') THEN
    RAISE EXCEPTION 'assert failed: authenticated has table-level UPDATE on campaign_distributions';
  END IF;

  -- ----- (b) campaigns: granted columns must be TRUE
  IF NOT has_column_privilege('authenticated', 'public.campaigns', 'title', 'UPDATE') THEN
    RAISE EXCEPTION 'assert failed: authenticated lost UPDATE on campaigns.title';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.campaigns', 'description', 'UPDATE') THEN
    RAISE EXCEPTION 'assert failed: authenticated lost UPDATE on campaigns.description';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.campaigns', 'brief', 'UPDATE') THEN
    RAISE EXCEPTION 'assert failed: authenticated lost UPDATE on campaigns.brief';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.campaigns', 'reference_assets', 'UPDATE') THEN
    RAISE EXCEPTION 'assert failed: authenticated lost UPDATE on campaigns.reference_assets';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.campaigns', 'request_metadata', 'UPDATE') THEN
    RAISE EXCEPTION 'assert failed: authenticated lost UPDATE on campaigns.request_metadata';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.campaigns', 'updated_at', 'UPDATE') THEN
    RAISE EXCEPTION 'assert failed: authenticated lost UPDATE on campaigns.updated_at';
  END IF;

  -- ----- (c) campaigns: admin-only columns must be FALSE
  IF has_column_privilege('authenticated', 'public.campaigns', 'status', 'UPDATE') THEN
    RAISE EXCEPTION 'assert failed: authenticated has UPDATE on campaigns.status';
  END IF;
  IF has_column_privilege('authenticated', 'public.campaigns', 'decision_metadata', 'UPDATE') THEN
    RAISE EXCEPTION 'assert failed: authenticated has UPDATE on campaigns.decision_metadata';
  END IF;
  IF has_column_privilege('authenticated', 'public.campaigns', 'sponsor_workspace_id', 'UPDATE') THEN
    RAISE EXCEPTION 'assert failed: authenticated has UPDATE on campaigns.sponsor_workspace_id';
  END IF;
  IF has_column_privilege('authenticated', 'public.campaigns', 'has_external_sponsor', 'UPDATE') THEN
    RAISE EXCEPTION 'assert failed: authenticated has UPDATE on campaigns.has_external_sponsor';
  END IF;
  IF has_column_privilege('authenticated', 'public.campaigns', 'external_sponsor_name', 'UPDATE') THEN
    RAISE EXCEPTION 'assert failed: authenticated has UPDATE on campaigns.external_sponsor_name';
  END IF;
  IF has_column_privilege('authenticated', 'public.campaigns', 'compensation_model', 'UPDATE') THEN
    RAISE EXCEPTION 'assert failed: authenticated has UPDATE on campaigns.compensation_model';
  END IF;
  IF has_column_privilege('authenticated', 'public.campaigns', 'compensation_metadata', 'UPDATE') THEN
    RAISE EXCEPTION 'assert failed: authenticated has UPDATE on campaigns.compensation_metadata';
  END IF;
  IF has_column_privilege('authenticated', 'public.campaigns', 'submission_open_at', 'UPDATE') THEN
    RAISE EXCEPTION 'assert failed: authenticated has UPDATE on campaigns.submission_open_at';
  END IF;
  IF has_column_privilege('authenticated', 'public.campaigns', 'submission_close_at', 'UPDATE') THEN
    RAISE EXCEPTION 'assert failed: authenticated has UPDATE on campaigns.submission_close_at';
  END IF;
  IF has_column_privilege('authenticated', 'public.campaigns', 'distribution_starts_at', 'UPDATE') THEN
    RAISE EXCEPTION 'assert failed: authenticated has UPDATE on campaigns.distribution_starts_at';
  END IF;
  IF has_column_privilege('authenticated', 'public.campaigns', 'allow_r2_upload', 'UPDATE') THEN
    RAISE EXCEPTION 'assert failed: authenticated has UPDATE on campaigns.allow_r2_upload';
  END IF;
  IF has_column_privilege('authenticated', 'public.campaigns', 'allow_external_url', 'UPDATE') THEN
    RAISE EXCEPTION 'assert failed: authenticated has UPDATE on campaigns.allow_external_url';
  END IF;
  IF has_column_privilege('authenticated', 'public.campaigns', 'slug', 'UPDATE') THEN
    RAISE EXCEPTION 'assert failed: authenticated has UPDATE on campaigns.slug';
  END IF;
  IF has_column_privilege('authenticated', 'public.campaigns', 'created_by', 'UPDATE') THEN
    RAISE EXCEPTION 'assert failed: authenticated has UPDATE on campaigns.created_by';
  END IF;

  -- ----- (d) campaign_categories: no UPDATE on any column for authenticated
  IF has_column_privilege('authenticated', 'public.campaign_categories', 'name', 'UPDATE') THEN
    RAISE EXCEPTION 'assert failed: authenticated has UPDATE on campaign_categories.name';
  END IF;
  IF has_column_privilege('authenticated', 'public.campaign_categories', 'description', 'UPDATE') THEN
    RAISE EXCEPTION 'assert failed: authenticated has UPDATE on campaign_categories.description';
  END IF;
  IF has_column_privilege('authenticated', 'public.campaign_categories', 'format_spec', 'UPDATE') THEN
    RAISE EXCEPTION 'assert failed: authenticated has UPDATE on campaign_categories.format_spec';
  END IF;
  IF has_column_privilege('authenticated', 'public.campaign_categories', 'display_order', 'UPDATE') THEN
    RAISE EXCEPTION 'assert failed: authenticated has UPDATE on campaign_categories.display_order';
  END IF;

  -- ----- (e) campaign_submissions: granted columns TRUE
  IF NOT has_column_privilege('authenticated', 'public.campaign_submissions', 'status', 'UPDATE') THEN
    RAISE EXCEPTION 'assert failed: authenticated lost UPDATE on campaign_submissions.status';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.campaign_submissions', 'title', 'UPDATE') THEN
    RAISE EXCEPTION 'assert failed: authenticated lost UPDATE on campaign_submissions.title';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.campaign_submissions', 'description', 'UPDATE') THEN
    RAISE EXCEPTION 'assert failed: authenticated lost UPDATE on campaign_submissions.description';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.campaign_submissions', 'content_r2_key', 'UPDATE') THEN
    RAISE EXCEPTION 'assert failed: authenticated lost UPDATE on campaign_submissions.content_r2_key';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.campaign_submissions', 'external_url', 'UPDATE') THEN
    RAISE EXCEPTION 'assert failed: authenticated lost UPDATE on campaign_submissions.external_url';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.campaign_submissions', 'thumbnail_r2_key', 'UPDATE') THEN
    RAISE EXCEPTION 'assert failed: authenticated lost UPDATE on campaign_submissions.thumbnail_r2_key';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.campaign_submissions', 'duration_seconds', 'UPDATE') THEN
    RAISE EXCEPTION 'assert failed: authenticated lost UPDATE on campaign_submissions.duration_seconds';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.campaign_submissions', 'distributed_at', 'UPDATE') THEN
    RAISE EXCEPTION 'assert failed: authenticated lost UPDATE on campaign_submissions.distributed_at';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.campaign_submissions', 'updated_at', 'UPDATE') THEN
    RAISE EXCEPTION 'assert failed: authenticated lost UPDATE on campaign_submissions.updated_at';
  END IF;

  -- ----- (f) campaign_submissions: admin-only columns FALSE
  IF has_column_privilege('authenticated', 'public.campaign_submissions', 'campaign_id', 'UPDATE') THEN
    RAISE EXCEPTION 'assert failed: authenticated has UPDATE on campaign_submissions.campaign_id';
  END IF;
  IF has_column_privilege('authenticated', 'public.campaign_submissions', 'category_id', 'UPDATE') THEN
    RAISE EXCEPTION 'assert failed: authenticated has UPDATE on campaign_submissions.category_id';
  END IF;
  IF has_column_privilege('authenticated', 'public.campaign_submissions', 'applicant_workspace_id', 'UPDATE') THEN
    RAISE EXCEPTION 'assert failed: authenticated has UPDATE on campaign_submissions.applicant_workspace_id';
  END IF;
  IF has_column_privilege('authenticated', 'public.campaign_submissions', 'applicant_email', 'UPDATE') THEN
    RAISE EXCEPTION 'assert failed: authenticated has UPDATE on campaign_submissions.applicant_email';
  END IF;
  IF has_column_privilege('authenticated', 'public.campaign_submissions', 'applicant_name', 'UPDATE') THEN
    RAISE EXCEPTION 'assert failed: authenticated has UPDATE on campaign_submissions.applicant_name';
  END IF;
  IF has_column_privilege('authenticated', 'public.campaign_submissions', 'applicant_phone', 'UPDATE') THEN
    RAISE EXCEPTION 'assert failed: authenticated has UPDATE on campaign_submissions.applicant_phone';
  END IF;
  IF has_column_privilege('authenticated', 'public.campaign_submissions', 'team_name', 'UPDATE') THEN
    RAISE EXCEPTION 'assert failed: authenticated has UPDATE on campaign_submissions.team_name';
  END IF;
  IF has_column_privilege('authenticated', 'public.campaign_submissions', 'submitted_at', 'UPDATE') THEN
    RAISE EXCEPTION 'assert failed: authenticated has UPDATE on campaign_submissions.submitted_at';
  END IF;
  IF has_column_privilege('authenticated', 'public.campaign_submissions', 'approved_at', 'UPDATE') THEN
    RAISE EXCEPTION 'assert failed: authenticated has UPDATE on campaign_submissions.approved_at';
  END IF;
  IF has_column_privilege('authenticated', 'public.campaign_submissions', 'declined_at', 'UPDATE') THEN
    RAISE EXCEPTION 'assert failed: authenticated has UPDATE on campaign_submissions.declined_at';
  END IF;

  -- ----- (g) campaign_review_decisions: no UPDATE for authenticated on any column
  IF has_column_privilege('authenticated', 'public.campaign_review_decisions', 'submission_id', 'UPDATE') THEN
    RAISE EXCEPTION 'assert failed: authenticated has UPDATE on campaign_review_decisions.submission_id';
  END IF;
  IF has_column_privilege('authenticated', 'public.campaign_review_decisions', 'reviewer_user_id', 'UPDATE') THEN
    RAISE EXCEPTION 'assert failed: authenticated has UPDATE on campaign_review_decisions.reviewer_user_id';
  END IF;
  IF has_column_privilege('authenticated', 'public.campaign_review_decisions', 'decision', 'UPDATE') THEN
    RAISE EXCEPTION 'assert failed: authenticated has UPDATE on campaign_review_decisions.decision';
  END IF;
  IF has_column_privilege('authenticated', 'public.campaign_review_decisions', 'comment', 'UPDATE') THEN
    RAISE EXCEPTION 'assert failed: authenticated has UPDATE on campaign_review_decisions.comment';
  END IF;

  -- ----- (h) campaign_distributions: granted (metric) columns TRUE
  IF NOT has_column_privilege('authenticated', 'public.campaign_distributions', 'view_count', 'UPDATE') THEN
    RAISE EXCEPTION 'assert failed: authenticated lost UPDATE on campaign_distributions.view_count';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.campaign_distributions', 'like_count', 'UPDATE') THEN
    RAISE EXCEPTION 'assert failed: authenticated lost UPDATE on campaign_distributions.like_count';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.campaign_distributions', 'comment_count', 'UPDATE') THEN
    RAISE EXCEPTION 'assert failed: authenticated lost UPDATE on campaign_distributions.comment_count';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.campaign_distributions', 'metric_logged_at', 'UPDATE') THEN
    RAISE EXCEPTION 'assert failed: authenticated lost UPDATE on campaign_distributions.metric_logged_at';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.campaign_distributions', 'metric_log_notes', 'UPDATE') THEN
    RAISE EXCEPTION 'assert failed: authenticated lost UPDATE on campaign_distributions.metric_log_notes';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.campaign_distributions', 'updated_at', 'UPDATE') THEN
    RAISE EXCEPTION 'assert failed: authenticated lost UPDATE on campaign_distributions.updated_at';
  END IF;

  -- ----- (i) campaign_distributions: admin-only columns FALSE
  IF has_column_privilege('authenticated', 'public.campaign_distributions', 'submission_id', 'UPDATE') THEN
    RAISE EXCEPTION 'assert failed: authenticated has UPDATE on campaign_distributions.submission_id';
  END IF;
  IF has_column_privilege('authenticated', 'public.campaign_distributions', 'channel', 'UPDATE') THEN
    RAISE EXCEPTION 'assert failed: authenticated has UPDATE on campaign_distributions.channel';
  END IF;
  IF has_column_privilege('authenticated', 'public.campaign_distributions', 'url', 'UPDATE') THEN
    RAISE EXCEPTION 'assert failed: authenticated has UPDATE on campaign_distributions.url';
  END IF;
  IF has_column_privilege('authenticated', 'public.campaign_distributions', 'posted_at', 'UPDATE') THEN
    RAISE EXCEPTION 'assert failed: authenticated has UPDATE on campaign_distributions.posted_at';
  END IF;
  IF has_column_privilege('authenticated', 'public.campaign_distributions', 'added_by', 'UPDATE') THEN
    RAISE EXCEPTION 'assert failed: authenticated has UPDATE on campaign_distributions.added_by';
  END IF;
  IF has_column_privilege('authenticated', 'public.campaign_distributions', 'notes', 'UPDATE') THEN
    RAISE EXCEPTION 'assert failed: authenticated has UPDATE on campaign_distributions.notes';
  END IF;

  -- ===========================================================================
  -- K-05 LOOP-1 F3 MED-A: INSERT column matrix asserts.
  -- These would have caught F1 + F2 if present in LOOP-1. Asserting INSERT
  -- privileges on direct-client INSERT paths (campaigns, campaign_distributions)
  -- prevents future drift from re-introducing the seedable-audit-fields gap.
  -- campaign_categories / campaign_submissions / campaign_review_decisions:
  -- INSERT goes through service-role only, so authenticated must have NO
  -- INSERT (table-level NOT GRANTed by default — assert it stays that way).
  -- ===========================================================================

  -- ----- (j) campaigns INSERT: granted columns TRUE, admin-only FALSE
  IF has_table_privilege('authenticated', 'public.campaigns', 'INSERT') THEN
    RAISE EXCEPTION 'assert failed: authenticated has table-level INSERT on campaigns';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.campaigns', 'slug', 'INSERT') THEN
    RAISE EXCEPTION 'assert failed: authenticated lost INSERT on campaigns.slug';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.campaigns', 'title', 'INSERT') THEN
    RAISE EXCEPTION 'assert failed: authenticated lost INSERT on campaigns.title';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.campaigns', 'description', 'INSERT') THEN
    RAISE EXCEPTION 'assert failed: authenticated lost INSERT on campaigns.description';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.campaigns', 'brief', 'INSERT') THEN
    RAISE EXCEPTION 'assert failed: authenticated lost INSERT on campaigns.brief';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.campaigns', 'reference_assets', 'INSERT') THEN
    RAISE EXCEPTION 'assert failed: authenticated lost INSERT on campaigns.reference_assets';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.campaigns', 'sponsor_workspace_id', 'INSERT') THEN
    RAISE EXCEPTION 'assert failed: authenticated lost INSERT on campaigns.sponsor_workspace_id';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.campaigns', 'status', 'INSERT') THEN
    RAISE EXCEPTION 'assert failed: authenticated lost INSERT on campaigns.status';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.campaigns', 'request_metadata', 'INSERT') THEN
    RAISE EXCEPTION 'assert failed: authenticated lost INSERT on campaigns.request_metadata';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.campaigns', 'created_by', 'INSERT') THEN
    RAISE EXCEPTION 'assert failed: authenticated lost INSERT on campaigns.created_by';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.campaigns', 'updated_at', 'INSERT') THEN
    RAISE EXCEPTION 'assert failed: authenticated lost INSERT on campaigns.updated_at';
  END IF;
  -- created_at must remain DEFAULT-only (not seedable)
  IF has_column_privilege('authenticated', 'public.campaigns', 'created_at', 'INSERT') THEN
    RAISE EXCEPTION 'assert failed: authenticated has INSERT on campaigns.created_at';
  END IF;
  -- admin-only INSERT columns must remain FALSE
  IF has_column_privilege('authenticated', 'public.campaigns', 'has_external_sponsor', 'INSERT') THEN
    RAISE EXCEPTION 'assert failed: authenticated has INSERT on campaigns.has_external_sponsor';
  END IF;
  IF has_column_privilege('authenticated', 'public.campaigns', 'external_sponsor_name', 'INSERT') THEN
    RAISE EXCEPTION 'assert failed: authenticated has INSERT on campaigns.external_sponsor_name';
  END IF;
  IF has_column_privilege('authenticated', 'public.campaigns', 'decision_metadata', 'INSERT') THEN
    RAISE EXCEPTION 'assert failed: authenticated has INSERT on campaigns.decision_metadata';
  END IF;
  IF has_column_privilege('authenticated', 'public.campaigns', 'compensation_model', 'INSERT') THEN
    RAISE EXCEPTION 'assert failed: authenticated has INSERT on campaigns.compensation_model';
  END IF;
  IF has_column_privilege('authenticated', 'public.campaigns', 'compensation_metadata', 'INSERT') THEN
    RAISE EXCEPTION 'assert failed: authenticated has INSERT on campaigns.compensation_metadata';
  END IF;
  IF has_column_privilege('authenticated', 'public.campaigns', 'submission_open_at', 'INSERT') THEN
    RAISE EXCEPTION 'assert failed: authenticated has INSERT on campaigns.submission_open_at';
  END IF;
  IF has_column_privilege('authenticated', 'public.campaigns', 'submission_close_at', 'INSERT') THEN
    RAISE EXCEPTION 'assert failed: authenticated has INSERT on campaigns.submission_close_at';
  END IF;
  IF has_column_privilege('authenticated', 'public.campaigns', 'distribution_starts_at', 'INSERT') THEN
    RAISE EXCEPTION 'assert failed: authenticated has INSERT on campaigns.distribution_starts_at';
  END IF;
  IF has_column_privilege('authenticated', 'public.campaigns', 'allow_r2_upload', 'INSERT') THEN
    RAISE EXCEPTION 'assert failed: authenticated has INSERT on campaigns.allow_r2_upload';
  END IF;
  IF has_column_privilege('authenticated', 'public.campaigns', 'allow_external_url', 'INSERT') THEN
    RAISE EXCEPTION 'assert failed: authenticated has INSERT on campaigns.allow_external_url';
  END IF;

  -- ----- (k) campaign_distributions INSERT: granted columns TRUE, admin-only FALSE
  IF has_table_privilege('authenticated', 'public.campaign_distributions', 'INSERT') THEN
    RAISE EXCEPTION 'assert failed: authenticated has table-level INSERT on campaign_distributions';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.campaign_distributions', 'submission_id', 'INSERT') THEN
    RAISE EXCEPTION 'assert failed: authenticated lost INSERT on campaign_distributions.submission_id';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.campaign_distributions', 'channel', 'INSERT') THEN
    RAISE EXCEPTION 'assert failed: authenticated lost INSERT on campaign_distributions.channel';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.campaign_distributions', 'url', 'INSERT') THEN
    RAISE EXCEPTION 'assert failed: authenticated lost INSERT on campaign_distributions.url';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.campaign_distributions', 'posted_at', 'INSERT') THEN
    RAISE EXCEPTION 'assert failed: authenticated lost INSERT on campaign_distributions.posted_at';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.campaign_distributions', 'added_by', 'INSERT') THEN
    RAISE EXCEPTION 'assert failed: authenticated lost INSERT on campaign_distributions.added_by';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.campaign_distributions', 'notes', 'INSERT') THEN
    RAISE EXCEPTION 'assert failed: authenticated lost INSERT on campaign_distributions.notes';
  END IF;
  -- created_at / updated_at must remain DEFAULT-only (not seedable)
  IF has_column_privilege('authenticated', 'public.campaign_distributions', 'created_at', 'INSERT') THEN
    RAISE EXCEPTION 'assert failed: authenticated has INSERT on campaign_distributions.created_at';
  END IF;
  IF has_column_privilege('authenticated', 'public.campaign_distributions', 'updated_at', 'INSERT') THEN
    RAISE EXCEPTION 'assert failed: authenticated has INSERT on campaign_distributions.updated_at';
  END IF;
  -- admin-only INSERT columns must remain FALSE
  IF has_column_privilege('authenticated', 'public.campaign_distributions', 'view_count', 'INSERT') THEN
    RAISE EXCEPTION 'assert failed: authenticated has INSERT on campaign_distributions.view_count';
  END IF;
  IF has_column_privilege('authenticated', 'public.campaign_distributions', 'like_count', 'INSERT') THEN
    RAISE EXCEPTION 'assert failed: authenticated has INSERT on campaign_distributions.like_count';
  END IF;
  IF has_column_privilege('authenticated', 'public.campaign_distributions', 'comment_count', 'INSERT') THEN
    RAISE EXCEPTION 'assert failed: authenticated has INSERT on campaign_distributions.comment_count';
  END IF;
  IF has_column_privilege('authenticated', 'public.campaign_distributions', 'metric_logged_at', 'INSERT') THEN
    RAISE EXCEPTION 'assert failed: authenticated has INSERT on campaign_distributions.metric_logged_at';
  END IF;
  IF has_column_privilege('authenticated', 'public.campaign_distributions', 'metric_log_notes', 'INSERT') THEN
    RAISE EXCEPTION 'assert failed: authenticated has INSERT on campaign_distributions.metric_log_notes';
  END IF;

  -- ----- (l) campaign_categories / submissions / review_decisions INSERT must remain table-default DENY
  IF has_table_privilege('authenticated', 'public.campaign_categories', 'INSERT') THEN
    RAISE EXCEPTION 'assert failed: authenticated has table-level INSERT on campaign_categories';
  END IF;
  IF has_table_privilege('authenticated', 'public.campaign_submissions', 'INSERT') THEN
    RAISE EXCEPTION 'assert failed: authenticated has table-level INSERT on campaign_submissions';
  END IF;
  IF has_table_privilege('authenticated', 'public.campaign_review_decisions', 'INSERT') THEN
    RAISE EXCEPTION 'assert failed: authenticated has table-level INSERT on campaign_review_decisions';
  END IF;
END $$;
