-- =============================================================================
-- Phase 2.8 G_B-1 — Brief Board (의뢰 시점 + 진행 중 협업 공간)
-- =============================================================================
-- Source: .yagi-autobuild/phase-2-8/SPEC.md §3 + §5.4
-- Scope:
--   1. project_briefs                  — 1:1 brief content (TipTap JSON)
--   2. project_brief_versions          — append-only snapshot history
--   3. project_brief_assets            — R2-uploaded assets metadata
--   4. embed_cache                     — oEmbed response cache (7d TTL)
--   5. RLS policies (per §3.6 — using is_ws_member/is_ws_admin via projects join)
--   6. Lock state-transition + column-guard trigger (yagi_admin-only flip)
--   7. updated_at maintenance trigger
--   8. Realtime publication for project_brief_versions
--
-- SPEC drift note (§3.5): SPEC directs `ALTER TYPE thread_kind ADD VALUE
-- 'project_brief'`. The current schema has no `threads` table with a `kind`
-- enum — comments live in `project_threads` + `thread_messages` (Phase 1.x),
-- which are already project-scoped. v1 reuses that infrastructure unchanged.
-- Block-level inline comment anchoring (Phase 2.9) is the correct moment to
-- introduce a `kind` / `anchor_block_id` schema change. Logged in
-- .yagi-autobuild/phase-2-8/FOLLOWUPS.md as FU-2.8-comment-kind.
--
-- Pattern provenance: Phase 2.7 commission_soft_launch migration —
--   - DROP POLICY IF EXISTS / CREATE POLICY (re-apply safe)
--   - SECURITY DEFINER + SET search_path = public, pg_temp (Q-006)
--   - REVOKE ALL ON FUNCTION ... FROM PUBLIC
--   - (select auth.uid()) subquery form for RLS optimizer
--   - FORCE ROW LEVEL SECURITY on every new table
--   - Column-guard + state-transition trigger pattern
-- =============================================================================


-- =============================================================================
-- 1. project_briefs — 1:1 brief content with projects
-- =============================================================================
-- TipTap ProseMirror document JSON in content_json. status='locked' means
-- production-frozen (admin-only flip, enforced by trigger §6). current_version
-- = 0 means no explicit snapshot saved yet; ≥1 = number of saveVersion calls.

CREATE TABLE IF NOT EXISTS public.project_briefs (
  project_id    uuid PRIMARY KEY REFERENCES public.projects(id) ON DELETE CASCADE,
  content_json  jsonb NOT NULL DEFAULT '{"type":"doc","content":[]}'::jsonb
                  CHECK (octet_length(content_json::text) <= 2097152),
  -- 2 MiB hard cap (K05-G_B_1-03 fix). Mirrors the server-action 2 MiB
  -- guard in src/app/[locale]/app/projects/[id]/brief/actions.ts; this is
  -- the database-level defense-in-depth for direct PostgREST writes.
  status        text NOT NULL DEFAULT 'editing'
                  CHECK (status IN ('editing','locked')),
  current_version int NOT NULL DEFAULT 0
                  CHECK (current_version >= 0),
  tiptap_schema_version int NOT NULL DEFAULT 1
                  CHECK (tiptap_schema_version >= 1),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  updated_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.project_briefs IS
  'Phase 2.8 — brief board content (TipTap ProseMirror JSON). 1:1 with projects.id. '
  'status: editing (default) or locked (production frozen, yagi_admin-only flip).';

ALTER TABLE public.project_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_briefs FORCE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS project_briefs_status_idx
  ON public.project_briefs(status);


-- =============================================================================
-- 2. project_brief_versions — append-only snapshot history
-- =============================================================================
-- Each row is one explicit "v{n} 저장" snapshot. version_n monotonic per
-- project, gap-free (server action computes max+1). UNIQUE (project_id,
-- version_n) prevents racing duplicate inserts.
--
-- Restore flow (SPEC §5.3): copy v_k.content_json → project_briefs.content_json,
-- next saveVersion creates v_(current+1). Old v_k row is preserved. UPDATE/
-- DELETE on this table is denied by RLS — append-only.

CREATE TABLE IF NOT EXISTS public.project_brief_versions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  version_n     int NOT NULL CHECK (version_n >= 1),
  content_json  jsonb NOT NULL
                  CHECK (octet_length(content_json::text) <= 2097152),
  -- Same 2 MiB cap as project_briefs.content_json (K05-G_B_1-03 fix).
  label         text CHECK (label IS NULL OR char_length(label) BETWEEN 1 AND 200),
  created_at    timestamptz NOT NULL DEFAULT now(),
  created_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (project_id, version_n)
);

COMMENT ON TABLE public.project_brief_versions IS
  'Phase 2.8 — append-only snapshot history of project_briefs.content_json. '
  'No UPDATE/DELETE — preserved for audit and restore.';

ALTER TABLE public.project_brief_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_brief_versions FORCE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS project_brief_versions_project_idx
  ON public.project_brief_versions(project_id, version_n DESC);


-- =============================================================================
-- 3. project_brief_assets — R2-uploaded assets metadata
-- =============================================================================
-- Each row is one R2 object referenced by an image/file block in
-- content_json. byte_size hard-capped at 200MB per SPEC §4.B3 (videos go to
-- embed). storage_key shape: project-briefs/{project_id}/{uuid}.{ext} —
-- enforced at the server-action layer, not by SQL.
--
-- Orphan GC v1 = not implemented (SPEC §3.3 Note). Project deletion cascades.

CREATE TABLE IF NOT EXISTS public.project_brief_assets (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  storage_key   text NOT NULL CHECK (char_length(storage_key) BETWEEN 1 AND 500),
  mime_type     text NOT NULL CHECK (char_length(mime_type) BETWEEN 1 AND 200),
  byte_size     bigint NOT NULL CHECK (byte_size > 0 AND byte_size <= 209715200),
  original_name text CHECK (original_name IS NULL OR char_length(original_name) <= 500),
  uploaded_at   timestamptz NOT NULL DEFAULT now(),
  uploaded_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.project_brief_assets IS
  'Phase 2.8 — R2-uploaded asset metadata referenced from project_briefs.content_json. '
  'byte_size hard cap 200MB (videos use embed blocks instead).';

ALTER TABLE public.project_brief_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_brief_assets FORCE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS project_brief_assets_project_idx
  ON public.project_brief_assets(project_id);


-- =============================================================================
-- 4. embed_cache — oEmbed response cache (7-day TTL)
-- =============================================================================
-- Server-side cache of oEmbed responses keyed by canonicalized URL.
-- response_json shape: {title, thumbnail_url, width, height, author_name,
-- provider_name}. Note: no `html` field — client renders iframes itself per
-- whitelist (SPEC §4.B4) so we never store provider HTML, eliminating XSS
-- via cache poisoning.
--
-- Write path: server-action only (service-role). authenticated SELECT for
-- server-side read in fetchEmbed before falling back to network. Stale
-- refresh job is Phase 2.8.1; v1 just serves stale until cron exists.

CREATE TABLE IF NOT EXISTS public.embed_cache (
  url           text PRIMARY KEY CHECK (char_length(url) BETWEEN 1 AND 2048),
  provider      text NOT NULL CHECK (provider IN ('youtube','vimeo','generic')),
  response_json jsonb NOT NULL,
  fetched_at    timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz NOT NULL DEFAULT (now() + interval '7 days')
);

COMMENT ON TABLE public.embed_cache IS
  'Phase 2.8 — oEmbed response cache. SELECT open to authenticated; INSERT/UPDATE '
  'service-role only (server actions). Phase 2.8.1 adds figma/behance/pinterest/loom.';

ALTER TABLE public.embed_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.embed_cache FORCE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS embed_cache_expires_idx
  ON public.embed_cache(expires_at);


-- =============================================================================
-- 5. RLS policies
-- =============================================================================
-- Predicate model (SPEC §3.6 + alignment with existing projects RLS):
--   - SELECT/UPDATE on brief content: any workspace member (is_ws_member)
--     OR yagi_admin. Brief Board is collaborative (Y3: admin can fill draft).
--   - INSERT: same predicate; the wizard creates the brief alongside the
--     draft project (single tx in G_B_7).
--   - status flip ('editing' ↔ 'locked'): yagi_admin only — enforced by
--     trigger (§6), not RLS WITH CHECK (RLS cannot reach OLD/NEW columns).
--   - DELETE: cascade-only via projects ON DELETE CASCADE; no policy.
--
-- All policies use (select auth.uid()) for the optimizer subquery cache
-- pattern (Phase 2.7+ convention).

-- ----- project_briefs -----

DROP POLICY IF EXISTS project_briefs_select ON public.project_briefs;
CREATE POLICY project_briefs_select
  ON public.project_briefs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_briefs.project_id
        AND (
          public.is_ws_member((select auth.uid()), p.workspace_id)
          OR public.is_yagi_admin((select auth.uid()))
        )
    )
  );

DROP POLICY IF EXISTS project_briefs_insert ON public.project_briefs;
CREATE POLICY project_briefs_insert
  ON public.project_briefs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_briefs.project_id
        AND (
          public.is_ws_member((select auth.uid()), p.workspace_id)
          OR public.is_yagi_admin((select auth.uid()))
        )
    )
  );

-- UPDATE: workspace member can edit while status='editing'. The
-- editing-vs-locked status check is in USING — non-admin attempts on
-- locked rows return zero matching rows (per RLS semantics) and
-- the UPDATE no-ops without raising. The trigger (§6) is the source of
-- truth that RAISEs on illegal status flips and tampering of guarded
-- columns. yagi_admin bypasses the editing check via the second policy.
DROP POLICY IF EXISTS project_briefs_update_member ON public.project_briefs;
CREATE POLICY project_briefs_update_member
  ON public.project_briefs
  FOR UPDATE
  TO authenticated
  USING (
    status = 'editing'
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_briefs.project_id
        AND public.is_ws_member((select auth.uid()), p.workspace_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_briefs.project_id
        AND public.is_ws_member((select auth.uid()), p.workspace_id)
    )
  );

DROP POLICY IF EXISTS project_briefs_update_yagi ON public.project_briefs;
CREATE POLICY project_briefs_update_yagi
  ON public.project_briefs
  FOR UPDATE
  TO authenticated
  USING (public.is_yagi_admin((select auth.uid())))
  WITH CHECK (public.is_yagi_admin((select auth.uid())));


-- ----- project_brief_versions (append-only) -----

DROP POLICY IF EXISTS project_brief_versions_select ON public.project_brief_versions;
CREATE POLICY project_brief_versions_select
  ON public.project_brief_versions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_brief_versions.project_id
        AND (
          public.is_ws_member((select auth.uid()), p.workspace_id)
          OR public.is_yagi_admin((select auth.uid()))
        )
    )
  );

-- INSERT: workspace member or yagi_admin. created_by must equal auth.uid()
-- so an attacker cannot spoof attribution on an append-only audit row
-- (K05-G_B_1-05 fix). The trigger (§6) additionally requires the
-- project_briefs.status to be 'editing' at snapshot time.
DROP POLICY IF EXISTS project_brief_versions_insert ON public.project_brief_versions;
CREATE POLICY project_brief_versions_insert
  ON public.project_brief_versions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = (select auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_brief_versions.project_id
        AND (
          public.is_ws_member((select auth.uid()), p.workspace_id)
          OR public.is_yagi_admin((select auth.uid()))
        )
    )
  );

-- No UPDATE / DELETE policies — append-only.


-- ----- project_brief_assets -----

DROP POLICY IF EXISTS project_brief_assets_select ON public.project_brief_assets;
CREATE POLICY project_brief_assets_select
  ON public.project_brief_assets
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_brief_assets.project_id
        AND (
          public.is_ws_member((select auth.uid()), p.workspace_id)
          OR public.is_yagi_admin((select auth.uid()))
        )
    )
  );

DROP POLICY IF EXISTS project_brief_assets_insert ON public.project_brief_assets;
CREATE POLICY project_brief_assets_insert
  ON public.project_brief_assets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by = (select auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_brief_assets.project_id
        AND (
          public.is_ws_member((select auth.uid()), p.workspace_id)
          OR public.is_yagi_admin((select auth.uid()))
        )
    )
  );

-- DELETE: own uploads or yagi_admin (SPEC §3.6).
DROP POLICY IF EXISTS project_brief_assets_delete ON public.project_brief_assets;
CREATE POLICY project_brief_assets_delete
  ON public.project_brief_assets
  FOR DELETE
  TO authenticated
  USING (
    uploaded_by = (select auth.uid())
    OR public.is_yagi_admin((select auth.uid()))
  );


-- ----- embed_cache -----

DROP POLICY IF EXISTS embed_cache_select ON public.embed_cache;
CREATE POLICY embed_cache_select
  ON public.embed_cache
  FOR SELECT
  TO authenticated
  USING (true);

-- No INSERT/UPDATE/DELETE policies — service-role-only writes via
-- src/app/api/embed/route.ts (added in G_B-4). FORCE RLS makes default-deny
-- effective even for table owner.


-- =============================================================================
-- 6. State-transition + column-guard trigger (INSERT and UPDATE)
-- =============================================================================
-- Mirrors Phase 2.7 commission_intakes pattern, extended to fire on INSERT
-- as well as UPDATE — the original UPDATE-only design left the initial
-- INSERT free to set `status='locked'` for a non-admin caller (Codex K-05
-- HIGH-A finding K05-G_B_1-01).
--
-- Guards (non-yagi_admin caller):
--   INSERT:
--     1. status must be 'editing' (no creating-already-locked briefs)
--     2. current_version must be 0 (no fast-forward at creation)
--     3. tiptap_schema_version must be 1 (current schema)
--   UPDATE:
--     1. status frozen (lock/unlock is yagi_admin only — SPEC §5.4)
--     2. tiptap_schema_version frozen
--     3. current_version: non-admin can ONLY increment by exactly 1 AND
--        only when a matching project_brief_versions row exists at the new
--        version_n. This forecloses K05-G_B_1-02 (member writing
--        current_version = 999999); the bump is now bound to a real
--        snapshot insert.
--
-- service_role / direct DB sessions (auth.uid() IS NULL) bypass — those
-- contexts are trusted (require service-role key or direct DB access).
-- yagi_admin bypasses all column guards (lock/unlock requires it; admin
-- migrations may need overrides).

CREATE OR REPLACE FUNCTION public.validate_project_brief_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_is_yagi_admin boolean := false;
  v_match_count int;
BEGIN
  IF v_caller IS NULL THEN
    RETURN NEW;
  END IF;

  v_is_yagi_admin := public.is_yagi_admin(v_caller);

  IF v_is_yagi_admin THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'editing' THEN
      RAISE EXCEPTION
        'non-admin must create project_brief with status=editing (got %)',
        NEW.status
        USING ERRCODE = '42501';
    END IF;
    IF NEW.current_version <> 0 THEN
      RAISE EXCEPTION
        'non-admin must create project_brief with current_version=0 (got %)',
        NEW.current_version
        USING ERRCODE = '42501';
    END IF;
    IF NEW.tiptap_schema_version <> 1 THEN
      RAISE EXCEPTION
        'non-admin must create project_brief with tiptap_schema_version=1 (got %)',
        NEW.tiptap_schema_version
        USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  -- TG_OP = 'UPDATE'
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION
      'only yagi_admin may change project_brief status'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.tiptap_schema_version IS DISTINCT FROM OLD.tiptap_schema_version THEN
    RAISE EXCEPTION
      'only yagi_admin may change tiptap_schema_version'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.current_version IS DISTINCT FROM OLD.current_version THEN
    -- Allow only a +1 increment, and only when the corresponding
    -- versions row exists. The non-decreasing invariant subsumes here.
    IF NEW.current_version <> OLD.current_version + 1 THEN
      RAISE EXCEPTION
        'non-admin current_version must increment by exactly 1 (% -> %)',
        OLD.current_version, NEW.current_version
        USING ERRCODE = '23514';
    END IF;

    SELECT count(*) INTO v_match_count
      FROM public.project_brief_versions
      WHERE project_id = NEW.project_id
        AND version_n = NEW.current_version;

    IF v_match_count = 0 THEN
      RAISE EXCEPTION
        'current_version bump to % requires matching project_brief_versions row',
        NEW.current_version
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.validate_project_brief_change() FROM PUBLIC;

-- Drop the prior UPDATE-only trigger if a previous apply attempt left it
-- behind. The new trigger fires on INSERT OR UPDATE.
DROP TRIGGER IF EXISTS validate_project_brief_update_trigger ON public.project_briefs;
DROP TRIGGER IF EXISTS validate_project_brief_change_trigger ON public.project_briefs;
CREATE TRIGGER validate_project_brief_change_trigger
  BEFORE INSERT OR UPDATE ON public.project_briefs
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_project_brief_change();

-- The old function name is replaced; drop it if a previous apply attempt
-- created it (idempotent re-apply safety).
DROP FUNCTION IF EXISTS public.validate_project_brief_update();


-- Append-only enforcement on project_brief_versions: reject any UPDATE.
-- DELETE is already denied by absent policy (RLS default-deny under FORCE).
CREATE OR REPLACE FUNCTION public.reject_project_brief_version_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION
    'project_brief_versions is append-only — UPDATE not permitted'
    USING ERRCODE = '42501';
END $$;

REVOKE ALL ON FUNCTION public.reject_project_brief_version_update() FROM PUBLIC;

DROP TRIGGER IF EXISTS reject_project_brief_version_update_trigger
  ON public.project_brief_versions;
CREATE TRIGGER reject_project_brief_version_update_trigger
  BEFORE UPDATE ON public.project_brief_versions
  FOR EACH ROW
  EXECUTE FUNCTION public.reject_project_brief_version_update();


-- Snapshot precondition: project_briefs.status must be 'editing' to take
-- a new version. Locked briefs cannot accept new snapshots — caller
-- must unlock first (yagi_admin only). Defense-in-depth alongside
-- server-action validation.
CREATE OR REPLACE FUNCTION public.validate_project_brief_version_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_status text;
  v_current int;
BEGIN
  -- FOR UPDATE serializes against concurrent project_briefs UPDATE (e.g.,
  -- a yagi_admin lock arriving while we're snapshotting). Without this,
  -- a snapshot could commit AFTER the brief flips to 'locked'
  -- (Codex K-05 finding K05-G_B_1-04).
  SELECT status, current_version
    INTO v_status, v_current
    FROM public.project_briefs
    WHERE project_id = NEW.project_id
    FOR UPDATE;

  IF v_status IS NULL THEN
    RAISE EXCEPTION
      'no project_briefs row for project_id % — INSERT brief row first',
      NEW.project_id
      USING ERRCODE = '23503'; -- foreign_key_violation flavor
  END IF;

  IF v_status <> 'editing' THEN
    RAISE EXCEPTION
      'cannot snapshot version when project_brief status is %',
      v_status
      USING ERRCODE = '23514';
  END IF;

  -- Enforce gap-free monotonic version_n. The UNIQUE constraint catches
  -- duplicate (project_id, version_n) but NEW.version_n could still be
  -- arbitrary (e.g., client-supplied 99). Tie it to current+1.
  IF NEW.version_n <> v_current + 1 THEN
    RAISE EXCEPTION
      'version_n must equal current_version + 1 (expected %, got %)',
      v_current + 1, NEW.version_n
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.validate_project_brief_version_insert() FROM PUBLIC;

DROP TRIGGER IF EXISTS validate_project_brief_version_insert_trigger
  ON public.project_brief_versions;
CREATE TRIGGER validate_project_brief_version_insert_trigger
  BEFORE INSERT ON public.project_brief_versions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_project_brief_version_insert();


-- =============================================================================
-- 7. updated_at maintenance trigger (project_briefs only)
-- =============================================================================
-- project_brief_versions has created_at only (immutable), no updated_at.
-- project_brief_assets is metadata-immutable post-INSERT (storage_key etc.
-- never change). embed_cache uses fetched_at semantics — server-action
-- recomputes on refresh, so no auto-touch needed.

CREATE OR REPLACE FUNCTION public.set_project_brief_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.set_project_brief_updated_at() FROM PUBLIC;

DROP TRIGGER IF EXISTS set_project_brief_updated_at_trigger ON public.project_briefs;
CREATE TRIGGER set_project_brief_updated_at_trigger
  BEFORE UPDATE ON public.project_briefs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_project_brief_updated_at();


-- =============================================================================
-- 8. Realtime publication
-- =============================================================================
-- project_brief_versions in publication: history sidebar updates live when
-- a collaborator saves a snapshot. Small payload (label, version_n, created_*).
--
-- project_briefs deliberately NOT in publication: content_json broadcast on
-- every auto-save would waste bandwidth (full doc on every keystroke window).
-- Collaborator awareness in v1 is via If-Match-Updated-At collision detect
-- (SPEC §5.5). Phase 2.9+ Yjs replaces this layer entirely.
--
-- project_brief_assets / embed_cache: not in publication.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'project_brief_versions'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.project_brief_versions';
  END IF;
END $$;


-- =============================================================================
-- END Phase 2.8 G_B-1
-- =============================================================================
