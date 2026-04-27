-- =============================================================================
-- Phase 3.0 — Project lifecycle: 7-state machine, history, references, RLS
-- =============================================================================
--
-- L-019 Pre-flight result (run 2026-04-28 before authoring):
--   unexpected_status_count = 0  (1 row, status='submitted' — valid in both old/new)
--   in_discovery/in_production rows = 0
--   kind column does not exist yet
--   project_status_history table does not exist yet
--   → PATH A: clean schema. ALTER with NOT NULL where appropriate.
--     Old CHECK (8 states: draft/submitted/in_discovery/in_production/in_revision/
--     delivered/approved/archived) replaced with new 9-state set.
--
-- State machine (7 observable states + submitted + archived = 9 total):
--   draft → submitted → in_review → in_progress ⇄ in_revision
--   in_progress → delivered → approved → archived
--   [many states] → cancelled
--
-- Role model used in this migration:
--   'client'          — workspace_member who owns the project (created_by)
--   'yagi_admin'      — user_roles.role = 'yagi_admin'
--   'workspace_admin' — user_roles.role = 'workspace_admin'
--   'system'          — server-side only (submitProjectAction). NOT assignable
--                       via transition_project_status RPC. Only used by direct
--                       DB write from server action (status='in_review' set
--                       directly without going through this RPC, per L-015).
--
-- Realtime decision: ENABLED on project_status_history per task recommendation.
--   Both ALTER PUBLICATION and GRANT are included below (L-020).
--
-- projects UPDATE policy approach: BEFORE UPDATE trigger that raises if
--   NEW.status IS DISTINCT FROM OLD.status AND the caller is not the SECURITY
--   DEFINER RPC. Implemented via a trigger guard function that checks a
--   session-local variable `local.transition_rpc_active` which the RPC sets
--   before modifying. This is cleaner than the USING(false) approach because
--   it allows wizard autosave (draft edits) to still go through the RLS UPDATE
--   policy while still blocking any direct status mutation.
--
-- Constraints enforced:
--   L-016: CHECK (kind = 'direct') — contest is Phase 6+
--   L-020: both ALTER PUBLICATION + GRANT for project_status_history
--   gen_random_uuid() throughout — no uuid_generate_v4()
--   No Korean characters anywhere
--   SECURITY DEFINER + SET search_path = public on all functions
-- =============================================================================

BEGIN;

-- =============================================================================
-- SECTION A: ALTER projects
-- =============================================================================

-- A-1. Replace status CHECK constraint with the new 9-state set.
--      The existing constraint name is projects_status_check (confirmed via
--      pg_constraint query in pre-flight).
--      Path A: no legacy in_discovery/in_production rows exist.
ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_status_check;

ALTER TABLE public.projects
  ADD CONSTRAINT projects_status_check
    CHECK (status = ANY (ARRAY[
      'draft',
      'submitted',
      'in_review',
      'in_progress',
      'in_revision',
      'delivered',
      'approved',
      'cancelled',
      'archived'
    ]));

COMMENT ON COLUMN public.projects.status IS
  'Phase 3.0 — 9-state lifecycle: draft → submitted → in_review → in_progress '
  '⇄ in_revision → delivered → approved → archived. Also: cancelled (from most '
  'pre-approved states). Transitions enforced exclusively by '
  'transition_project_status() RPC or submitProjectAction server action '
  '(submitted→in_review auto-transition, system actor, L-015). '
  'Direct UPDATE of this column by clients is blocked by trigger guard.';

-- A-2. Add kind column. Only 'direct' allowed in Phase 3.0 (L-016).
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'direct';

ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_kind_check;

ALTER TABLE public.projects
  ADD CONSTRAINT projects_kind_check
    CHECK (kind = 'direct');
    -- Intentionally single-value. When Phase 6 contest surface ships, add
    -- 'contest' here and remove this comment.

COMMENT ON COLUMN public.projects.kind IS
  'Phase 3.0 — project variant. Only ''direct'' allowed (L-016). '
  'Contest surface is Phase 6+; extend CHECK at that time.';

-- A-3. Add budget_band column.
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS budget_band text;

ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_budget_band_check;

ALTER TABLE public.projects
  ADD CONSTRAINT projects_budget_band_check
    CHECK (budget_band IS NULL OR budget_band = ANY (ARRAY[
      'under_1m',
      '1m_to_5m',
      '5m_to_10m',
      'negotiable'
    ]));

COMMENT ON COLUMN public.projects.budget_band IS
  'Phase 3.0 — rough budget indication selected by client during wizard. '
  'NULL = not yet provided.';

-- A-4. Add submitted_at column.
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz;

COMMENT ON COLUMN public.projects.submitted_at IS
  'Phase 3.0 — timestamp when project transitioned to submitted state. '
  'Set by transition_project_status() RPC or submitProjectAction server action. '
  'NULL for draft-only projects.';

-- =============================================================================
-- SECTION B: CREATE TABLE project_status_history
-- =============================================================================
-- from_status is NULL only for an initial-creation sentinel row (if ever
-- inserted). All RPC-driven transitions insert a non-null from_status.
-- We allow NULL to accommodate a future audit seeding pass.

CREATE TABLE IF NOT EXISTS public.project_status_history (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       uuid        NOT NULL
                                 REFERENCES public.projects(id) ON DELETE CASCADE,
  from_status      text        NULL,
  to_status        text        NOT NULL,
  actor_id         uuid        NULL
                                 REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_role       text        NOT NULL
                                 CHECK (actor_role IN (
                                   'client', 'yagi_admin', 'workspace_admin', 'system'
                                 )),
  comment          text        NULL,
  transitioned_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_status_history_project_id_idx
  ON public.project_status_history (project_id, transitioned_at DESC);

COMMENT ON TABLE public.project_status_history IS
  'Phase 3.0 — immutable audit log of every project lifecycle transition. '
  'Written exclusively by transition_project_status() RPC (SECURITY DEFINER). '
  'Direct INSERT/UPDATE/DELETE denied via RLS.';

-- Realtime publication (L-020 — both steps required):
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_status_history;
GRANT SELECT ON public.project_status_history TO authenticated, anon;

-- =============================================================================
-- SECTION C: ALTER project_references (table already exists from baseline)
-- =============================================================================
-- The baseline table has: id, project_id, added_by, storage_path, external_url,
-- og_title, og_description, og_image_url, caption, tags, created_at, media_type,
-- duration_seconds, page_count, thumbnail_path, embed_provider.
--
-- Phase 3.0 adds: kind, url (alias intent via new column), note, title,
-- thumbnail_url, sort_order.
-- We DO NOT drop existing columns — additive only. Old columns (og_*, tags,
-- storage_path, embed_provider, page_count) remain for backward compat with
-- existing 1 project row's reference data.
--
-- kind column replaces/augments media_type for the new UI surface. Both coexist:
-- media_type is the legacy raw type; kind is the Phase 3.0 typed enum.

ALTER TABLE public.project_references
  ADD COLUMN IF NOT EXISTS kind text;

-- Backfill kind from media_type for existing rows (safe: 0 or few rows in prod)
UPDATE public.project_references
  SET kind = CASE
    WHEN media_type = 'pdf'   THEN 'pdf'
    WHEN media_type = 'video' THEN 'video'
    WHEN media_type = 'image' THEN 'image'
    ELSE 'url'
  END
  WHERE kind IS NULL;

-- Now enforce NOT NULL and CHECK
ALTER TABLE public.project_references
  ALTER COLUMN kind SET NOT NULL;

ALTER TABLE public.project_references
  DROP CONSTRAINT IF EXISTS project_references_kind_check;

ALTER TABLE public.project_references
  ADD CONSTRAINT project_references_kind_check
    CHECK (kind IN ('url', 'image', 'pdf', 'video'));

ALTER TABLE public.project_references
  ADD COLUMN IF NOT EXISTS url text;

-- Backfill url from external_url for existing rows
UPDATE public.project_references
  SET url = external_url
  WHERE url IS NULL AND external_url IS NOT NULL;

ALTER TABLE public.project_references
  ADD COLUMN IF NOT EXISTS note text;

ALTER TABLE public.project_references
  ADD COLUMN IF NOT EXISTS title text;

-- Backfill title from og_title for existing rows
UPDATE public.project_references
  SET title = og_title
  WHERE title IS NULL AND og_title IS NOT NULL;

ALTER TABLE public.project_references
  ADD COLUMN IF NOT EXISTS thumbnail_url text;

-- Backfill thumbnail_url from og_image_url for existing rows
UPDATE public.project_references
  SET thumbnail_url = og_image_url
  WHERE thumbnail_url IS NULL AND og_image_url IS NOT NULL;

ALTER TABLE public.project_references
  ADD COLUMN IF NOT EXISTS sort_order int NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS project_references_project_sort_idx
  ON public.project_references (project_id, sort_order);

COMMENT ON TABLE public.project_references IS
  'Phase 3.0 — enriched reference collector for project wizard. '
  'Additive columns (kind, url, note, title, thumbnail_url, sort_order) '
  'added alongside legacy baseline columns which remain for backward compat.';

-- =============================================================================
-- SECTION D: FUNCTION is_valid_transition
-- =============================================================================
-- Truth table:
--
-- actor_role='client':
--   draft       → submitted          ✓
--   in_progress → in_revision        ✓
--   delivered   → in_revision        ✓
--   delivered   → approved           ✓  (client-only; admins may NOT approve)
--   draft       → cancelled          ✓
--   submitted   → cancelled          ✓
--   in_review   → cancelled          ✓
--   in_progress → cancelled          ✓
--   in_revision → cancelled          ✓
--   delivered   → cancelled          ✓
--
-- actor_role IN ('yagi_admin','workspace_admin'):
--   in_review   → in_progress        ✓
--   in_revision → in_progress        ✓
--   in_progress → delivered          ✓
--   draft       → cancelled          ✓
--   submitted   → cancelled          ✓
--   in_review   → cancelled          ✓
--   in_progress → cancelled          ✓
--   in_revision → cancelled          ✓
--   delivered   → cancelled          ✓
--   approved    → archived           ✓
--
-- actor_role='system':
--   submitted   → in_review          ✓  (the ONLY system transition — L-015)
--
-- All other combinations → FALSE.

CREATE OR REPLACE FUNCTION public.is_valid_transition(
  from_status text,
  to_status   text,
  actor_role  text
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE

    -- ---- client transitions ----
    WHEN actor_role = 'client' THEN
      CASE
        -- draft → submitted
        WHEN from_status = 'draft'        AND to_status = 'submitted'   THEN true
        -- in_progress → in_revision
        WHEN from_status = 'in_progress'  AND to_status = 'in_revision' THEN true
        -- delivered → in_revision
        WHEN from_status = 'delivered'    AND to_status = 'in_revision' THEN true
        -- delivered → approved  (client-ONLY; this pair intentionally absent from admin block)
        WHEN from_status = 'delivered'    AND to_status = 'approved'    THEN true
        -- [pre-approved states] → cancelled
        WHEN to_status = 'cancelled' AND from_status = ANY (ARRAY[
          'draft','submitted','in_review','in_progress','in_revision','delivered'
        ]) THEN true
        ELSE false
      END

    -- ---- admin transitions (yagi_admin OR workspace_admin) ----
    WHEN actor_role IN ('yagi_admin','workspace_admin') THEN
      CASE
        WHEN from_status = 'in_review'    AND to_status = 'in_progress' THEN true
        WHEN from_status = 'in_revision'  AND to_status = 'in_progress' THEN true
        WHEN from_status = 'in_progress'  AND to_status = 'delivered'   THEN true
        WHEN from_status = 'approved'     AND to_status = 'archived'    THEN true
        -- NOTE: admin may NOT set delivered→approved (that is client-only above)
        WHEN to_status = 'cancelled' AND from_status = ANY (ARRAY[
          'draft','submitted','in_review','in_progress','in_revision','delivered'
        ]) THEN true
        ELSE false
      END

    -- ---- system transition ----
    WHEN actor_role = 'system' THEN
      -- The ONLY system transition: submitted → in_review (L-015 auto-transition)
      CASE
        WHEN from_status = 'submitted' AND to_status = 'in_review' THEN true
        ELSE false
      END

    ELSE false
  END;
$$;

COMMENT ON FUNCTION public.is_valid_transition(text, text, text) IS
  'Phase 3.0 — pure truth-table guard for project state machine. IMMUTABLE. '
  'Called by transition_project_status() before any write. '
  'See migration header for full allowed-transition table.';

REVOKE ALL ON FUNCTION public.is_valid_transition(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_valid_transition(text, text, text)
  TO authenticated, service_role;

-- =============================================================================
-- SECTION E: FUNCTION transition_project_status
-- =============================================================================
-- SECURITY DEFINER RPC — the sole legal path for client/admin status changes.
-- Sets session variable local.transition_rpc_active = 'true' so the trigger
-- guard (Section F) knows to allow the status column write.
--
-- Actor resolution:
--   auth.uid() → user_roles table
--   yagi_admin  → actor_role = 'yagi_admin'
--   workspace_admin (for the same workspace as the project) → 'workspace_admin'
--   else → 'client'
--   system → NEVER reachable through this RPC; submitProjectAction uses a
--             direct server-side UPDATE (service role / RLS bypass) for the
--             auto submitted→in_review transition (L-015).
--
-- Authorization:
--   client path: caller must be projects.created_by
--   admin path:  caller must have yagi_admin or workspace_admin role for project's workspace
--
-- Comment requirement:
--   in_revision transitions require comment of ≥ 10 non-whitespace chars
--   (enforced so admin/client must explain the revision request).

CREATE OR REPLACE FUNCTION public.transition_project_status(
  p_project_id uuid,
  p_to_status  text,
  p_comment    text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id    uuid;
  v_actor_role  text;
  v_from_status text;
  v_created_by  uuid;
  v_workspace_id uuid;
  v_new_id      uuid;
  v_is_yagi_admin      boolean;
  v_is_ws_admin        boolean;
BEGIN

  -- 1. Authenticate
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501';
  END IF;

  -- 2. Resolve actor_role from user_roles table.
  --    'system' is NEVER assignable via this RPC (server action bypasses it).
  v_is_yagi_admin := public.is_yagi_admin(v_actor_id);

  -- 3. Lock and read current project state
  SELECT status, created_by, workspace_id
    INTO v_from_status, v_created_by, v_workspace_id
    FROM public.projects
   WHERE id = p_project_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'project_not_found' USING ERRCODE = 'P0002';
  END IF;

  -- 4. Resolve workspace-scoped admin role now that we have workspace_id
  v_is_ws_admin := EXISTS (
    SELECT 1 FROM public.user_roles
     WHERE user_id = v_actor_id
       AND role = 'workspace_admin'
       AND workspace_id = v_workspace_id
  );

  -- 5. Assign actor_role string
  IF v_is_yagi_admin THEN
    v_actor_role := 'yagi_admin';
  ELSIF v_is_ws_admin THEN
    v_actor_role := 'workspace_admin';
  ELSE
    -- Default to client; authorization gate below ensures they own the project
    v_actor_role := 'client';
  END IF;

  -- 6. Authorization gate
  IF v_actor_role = 'client' AND v_actor_id <> v_created_by THEN
    RAISE EXCEPTION 'forbidden: client may only transition own projects'
      USING ERRCODE = '42501';
  END IF;
  -- Admin roles have no per-project ownership restriction; they operate
  -- on any project in the workspace (or any project for yagi_admin).

  -- 7. Comment requirement: in_revision transitions need ≥ 10 non-whitespace chars
  IF p_to_status = 'in_revision' THEN
    IF p_comment IS NULL OR length(trim(p_comment)) < 10 THEN
      RAISE EXCEPTION 'comment_required_min_10_chars'
        USING ERRCODE = '22023';
    END IF;
  END IF;

  -- 8. Validate transition via truth table
  IF NOT public.is_valid_transition(v_from_status, p_to_status, v_actor_role) THEN
    RAISE EXCEPTION 'invalid_transition: % -> % for role %',
      v_from_status, p_to_status, v_actor_role
      USING ERRCODE = '23514';
  END IF;

  -- 9. Signal trigger guard to allow status column write
  PERFORM set_config('local.transition_rpc_active', 'true', true);

  -- 10. UPDATE projects
  UPDATE public.projects
     SET status       = p_to_status,
         updated_at   = now(),
         submitted_at = CASE
                          WHEN p_to_status = 'submitted' THEN now()
                          ELSE submitted_at
                        END
   WHERE id = p_project_id;

  -- 11. INSERT history row
  INSERT INTO public.project_status_history (
    project_id,
    from_status,
    to_status,
    actor_id,
    actor_role,
    comment
  ) VALUES (
    p_project_id,
    v_from_status,
    p_to_status,
    v_actor_id,
    v_actor_role,
    p_comment
  )
  RETURNING id INTO v_new_id;

  -- 12. Clear the session flag (belt-and-suspenders — local already resets at txn end)
  PERFORM set_config('local.transition_rpc_active', 'false', true);

  RETURN v_new_id;

END $$;

COMMENT ON FUNCTION public.transition_project_status(uuid, text, text) IS
  'Phase 3.0 — SECURITY DEFINER RPC. The ONLY legal path for client/admin '
  'project status transitions. Validates via is_valid_transition(), enforces '
  'comment requirement for in_revision, writes project_status_history row, '
  'returns new history row id. System actor (submitted→in_review) is handled '
  'by submitProjectAction server action directly — NOT via this RPC (L-015).';

REVOKE ALL ON FUNCTION public.transition_project_status(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transition_project_status(uuid, text, text)
  TO authenticated;

-- =============================================================================
-- SECTION F: Trigger guard — block direct status mutation on projects
-- =============================================================================
-- Approach chosen: BEFORE UPDATE trigger that raises if:
--   NEW.status IS DISTINCT FROM OLD.status
--   AND current_setting('local.transition_rpc_active', true) <> 'true'
--   AND NOT is_yagi_admin(auth.uid())  -- yagi_admin admin console escape hatch
--
-- This allows:
--   - wizard autosave (draft edits) — status unchanged → trigger no-ops
--   - transition_project_status() RPC — sets the session flag → passes
--   - submitProjectAction server action — uses service_role which bypasses
--     RLS and triggers on the Supabase server side (no trigger fires for
--     service_role direct writes via pg_net/supabase-js server client)
--     NOTE: if the server action uses the authenticated client, it must
--     call transition_project_status() for submitted→in_review.
--     The 'system' path is reserved for that server action's direct write.
--   - yagi_admin: bypassed via is_yagi_admin() check for emergency fixes.
--
-- Justification for trigger over USING(false): the USING(false) approach
-- would block ALL updates from clients, including wizard autosave of non-status
-- columns (title, brief, budget_band, etc.) on draft projects. The trigger
-- is more surgical — it fires only on status column change.

CREATE OR REPLACE FUNCTION public.guard_projects_status_direct_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only intervene when status is being changed
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  -- Allow if the SECURITY DEFINER RPC set the session flag
  IF current_setting('local.transition_rpc_active', true) = 'true' THEN
    RETURN NEW;
  END IF;

  -- Allow yagi_admin for emergency console fixes
  IF public.is_yagi_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  -- Block all other direct status mutations
  RAISE EXCEPTION
    'direct_status_update_forbidden: use transition_project_status() RPC'
    USING ERRCODE = '42501';
END $$;

DROP TRIGGER IF EXISTS trg_guard_projects_status ON public.projects;

CREATE TRIGGER trg_guard_projects_status
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_projects_status_direct_update();

COMMENT ON FUNCTION public.guard_projects_status_direct_update() IS
  'Phase 3.0 — BEFORE UPDATE trigger guard on projects. Raises 42501 if any '
  'caller attempts a direct status column change outside the '
  'transition_project_status() RPC. Exceptions: (1) transition RPC sets '
  'local.transition_rpc_active=true, (2) yagi_admin bypass for emergencies.';

-- =============================================================================
-- SECTION G: RLS — project_status_history
-- =============================================================================

ALTER TABLE public.project_status_history ENABLE ROW LEVEL SECURITY;

-- SELECT: client can read history for own projects
DROP POLICY IF EXISTS psh_select_client ON public.project_status_history;
CREATE POLICY psh_select_client ON public.project_status_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
       WHERE p.id = project_status_history.project_id
         AND p.created_by = auth.uid()
    )
  );

-- SELECT: yagi_admin can read all history
DROP POLICY IF EXISTS psh_select_admin ON public.project_status_history;
CREATE POLICY psh_select_admin ON public.project_status_history
  FOR SELECT TO authenticated
  USING (public.is_yagi_admin(auth.uid()));

-- INSERT: deny all direct inserts — only SECURITY DEFINER RPC may insert
-- (no policy = deny by default once RLS is enabled, but we make it explicit)
DROP POLICY IF EXISTS psh_insert_deny ON public.project_status_history;
CREATE POLICY psh_insert_deny ON public.project_status_history
  FOR INSERT TO authenticated
  WITH CHECK (false);

-- UPDATE: deny all
DROP POLICY IF EXISTS psh_update_deny ON public.project_status_history;
CREATE POLICY psh_update_deny ON public.project_status_history
  FOR UPDATE TO authenticated
  USING (false);

-- DELETE: deny all
DROP POLICY IF EXISTS psh_delete_deny ON public.project_status_history;
CREATE POLICY psh_delete_deny ON public.project_status_history
  FOR DELETE TO authenticated
  USING (false);

-- =============================================================================
-- SECTION H: RLS — project_references (replace single permissive policy)
-- =============================================================================
-- Baseline had a single proj_refs_rw policy (all operations, ws_member OR
-- yagi_admin). Phase 3.0 replaces it with split CRUD policies:
--   - client: full CRUD on own projects
--   - yagi_admin: SELECT only (admins read references but client owns them)
-- We DROP the old blanket policy and replace with named policies.

ALTER TABLE public.project_references ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS proj_refs_rw ON public.project_references;

-- SELECT: client (own projects) + yagi_admin (all)
DROP POLICY IF EXISTS pref_select_client ON public.project_references;
CREATE POLICY pref_select_client ON public.project_references
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
       WHERE p.id = project_references.project_id
         AND p.created_by = auth.uid()
    )
    OR public.is_yagi_admin(auth.uid())
  );

-- INSERT: client for own projects only
DROP POLICY IF EXISTS pref_insert_client ON public.project_references;
CREATE POLICY pref_insert_client ON public.project_references
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
       WHERE p.id = project_references.project_id
         AND p.created_by = auth.uid()
    )
  );

-- UPDATE: client for own projects only
DROP POLICY IF EXISTS pref_update_client ON public.project_references;
CREATE POLICY pref_update_client ON public.project_references
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
       WHERE p.id = project_references.project_id
         AND p.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
       WHERE p.id = project_references.project_id
         AND p.created_by = auth.uid()
    )
  );

-- DELETE: client for own projects only
DROP POLICY IF EXISTS pref_delete_client ON public.project_references;
CREATE POLICY pref_delete_client ON public.project_references
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
       WHERE p.id = project_references.project_id
         AND p.created_by = auth.uid()
    )
  );

-- =============================================================================
-- SECTION I: RLS — projects UPDATE policy (tighten for status guard)
-- =============================================================================
-- The existing projects_update policy (from Phase 2.8.2 hardening) allows
-- ws_admin or yagi_admin to update non-deleted rows. The trigger guard in
-- Section F handles the status-column-specific blocking. The RLS policy
-- itself is updated to also allow the project creator (client) to update
-- their own draft-status project (for wizard autosave), while keeping the
-- ws_admin path for admin-level field edits.
--
-- Note: the trigger guard is the enforcement layer for status column changes.
-- The RLS policy controls which rows are reachable for UPDATE at all.
-- We tighten: client (created_by) may UPDATE own rows where status='draft'
-- and deleted_at IS NULL. Admins retain their existing path.

DROP POLICY IF EXISTS projects_update ON public.projects;

CREATE POLICY projects_update ON public.projects
  FOR UPDATE TO authenticated
  USING (
    -- Client: own project, draft only, not deleted
    (
      auth.uid() = created_by
      AND status = 'draft'
      AND deleted_at IS NULL
    )
    -- ws_admin: any non-deleted project in workspace
    OR (
      public.is_ws_admin(auth.uid(), workspace_id)
      AND deleted_at IS NULL
    )
    -- yagi_admin: unrestricted (including trashed project restore)
    OR public.is_yagi_admin(auth.uid())
  )
  WITH CHECK (
    -- Client: own project, non-deleted only (no writing deleted_at)
    (
      auth.uid() = created_by
      AND deleted_at IS NULL
    )
    -- ws_admin: non-deleted only (cannot self-trash via update)
    OR (
      public.is_ws_admin(auth.uid(), workspace_id)
      AND deleted_at IS NULL
    )
    -- yagi_admin: unrestricted
    OR public.is_yagi_admin(auth.uid())
  );

COMMENT ON POLICY projects_update ON public.projects IS
  'Phase 3.0 — client may UPDATE own draft rows (wizard autosave). '
  'ws_admin may UPDATE any non-deleted project in workspace. '
  'yagi_admin unrestricted. Status column changes are additionally gated by '
  'trg_guard_projects_status trigger — only transition_project_status() RPC '
  'or yagi_admin may change projects.status.';

COMMIT;
