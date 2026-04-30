-- Phase 4.x -- task_01 -- workspace.kind + projects.twin_intent + projects.kind enum + project_licenses

-- ============================================================
-- 1. workspaces.kind
-- ============================================================
ALTER TABLE workspaces
  ADD COLUMN kind text NOT NULL DEFAULT 'brand'
    CHECK (kind IN ('brand', 'artist', 'yagi_admin'));

-- Existing rows = 'brand' (rational default at this stage)
-- yagi_admin workspace requires a MANUAL UPDATE after verify
UPDATE workspaces SET kind = 'brand' WHERE kind IS NULL;

CREATE INDEX idx_workspaces_kind ON workspaces(kind);

-- ============================================================
-- 2. projects.twin_intent
-- ============================================================
ALTER TABLE projects
  ADD COLUMN twin_intent text NOT NULL DEFAULT 'undecided'
    CHECK (twin_intent IN ('undecided', 'specific_in_mind', 'no_twin'));

-- ============================================================
-- 3. projects.kind enum expansion
-- ============================================================
ALTER TABLE projects
  DROP CONSTRAINT IF EXISTS projects_kind_check;

ALTER TABLE projects
  ADD CONSTRAINT projects_kind_check CHECK (kind IN (
    'direct',
    'inbound_brand_to_artist',
    'talent_initiated_creative',
    'talent_initiated_self_ad',
    'talent_initiated_brand_passthrough',
    'talent_initiated_footage_upgrade'
  ));

-- Existing data stays 'direct' (NOT NULL, no backfill needed)

-- ============================================================
-- 4. project_licenses (Phase 6 fills in; Phase 4 = schema + RLS only)
-- ============================================================
CREATE TABLE project_licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  campaign_name text NOT NULL,
  region text NOT NULL DEFAULT 'KR'
    CHECK (region IN ('KR', 'JP', 'US', 'EU', 'ASIA', 'GLOBAL')),
  start_date date NOT NULL,
  end_date date,  -- NULL allowed (perpetual; explicit end is the default)
  fee_amount_krw bigint NOT NULL DEFAULT 0,
  fee_currency text NOT NULL DEFAULT 'KRW',
  artist_share_percent integer NOT NULL DEFAULT 0
    CHECK (artist_share_percent BETWEEN 0 AND 100),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'expired', 'terminated')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES profiles(id)
);

CREATE INDEX idx_project_licenses_project ON project_licenses(project_id);
CREATE INDEX idx_project_licenses_status ON project_licenses(status);

-- RLS
ALTER TABLE project_licenses ENABLE ROW LEVEL SECURITY;

-- SELECT: yagi_admin (all rows) + project owner client (own rows)
CREATE POLICY "project_licenses_select_admin" ON project_licenses
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'yagi_admin'
    )
  );

CREATE POLICY "project_licenses_select_owner" ON project_licenses
  FOR SELECT TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

-- INSERT/UPDATE/DELETE: yagi_admin only (Phase 4 stage)
CREATE POLICY "project_licenses_write_admin" ON project_licenses
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'yagi_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'yagi_admin'
    )
  );

-- updated_at trigger
-- NOTE: KICKOFF spec references update_updated_at_column() but that function
-- only exists in the storage schema. The public equivalent in this codebase
-- is public.tg_touch_updated_at() -- using that here.
CREATE TRIGGER project_licenses_updated_at_trigger
  BEFORE UPDATE ON project_licenses
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_touch_updated_at();
